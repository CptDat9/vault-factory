import { ethers, getNamedAccounts, deployments } from "hardhat";
import { expect } from "chai";
import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { parseUnits } from "ethers";
import {
  VaultFactory,
  VaultFactory__factory,
  Vault,
  Vault__factory,
  ERC20Mintable,
  ERC20Mintable__factory,
  MockStrategy,
} from "../typechain-types";

describe("VaultFactory", () => {
  let vaultFactory: VaultFactory;
  let usdc: ERC20Mintable;
  let governance: ethers.Signer;
  let alice: ethers.Wallet;
  let bob: ethers.Wallet;
  let snapshot: SnapshotRestorer;
  const provider = ethers.provider;

  const timeUnlock = 7 * 24 * 60 * 60; // 7 days
  const amount = parseUnits("1000", 6); // 1000 USDC
  const poolId = 1;

  let vault: Vault;
  let strategy1: MockStrategy;
  let strategy2: MockStrategy;
  let strategy3: MockStrategy;

  before(async () => {
    await deployments.fixture(["mock", "vaultFactory"]);
    const { deployer } = await getNamedAccounts();
    governance = await ethers.getSigner(deployer);

    usdc = ERC20Mintable__factory.connect(
      (await deployments.get("USDC")).address,
      provider
    );
    
    vaultFactory = VaultFactory__factory.connect(
      (await deployments.get("VaultFactory")).address,
      governance
    );

    alice = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, provider);
    bob = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, provider);

    await governance.sendTransaction({ to: alice.address, value: ethers.parseEther("100") });
    await governance.sendTransaction({ to: bob.address, value: ethers.parseEther("100") });

    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  beforeEach(async () => {
    const MockStrategyFactory = await ethers.getContractFactory("MockStrategy", governance);

    strategy1 = await MockStrategyFactory.deploy() as MockStrategy;
    strategy2 = await MockStrategyFactory.deploy() as MockStrategy;
    strategy3 = await MockStrategyFactory.deploy() as MockStrategy;

    const governanceAddress = await governance.getAddress();

    // Initialize các strategy
    await strategy1.initialize(
      await vaultFactory.getAddress(),
      governanceAddress,
      governanceAddress,
      await usdc.getAddress(),
      "Strategy1",
      "STR1"
    );
    await strategy2.initialize(
      await vaultFactory.getAddress(),
      governanceAddress,
      governanceAddress,
      await usdc.getAddress(),
      "Strategy2",
      "STR2"
    );
    await strategy3.initialize(
      await vaultFactory.getAddress(),
      governanceAddress,
      governanceAddress,
      await usdc.getAddress(),
      "Strategy3",
      "STR3"
    );

    const vaultParams = {
      poolId,
      asset: await usdc.getAddress(),
      tokenName: "Test Vault",
      tokenSymbol: "TVT",
      profitMaxUnlockTime: timeUnlock,
      governance: governanceAddress,
      initialStrategies: [
        { strategy: await strategy1.getAddress(), addToQueue: true },
        { strategy: await strategy2.getAddress(), addToQueue: false },
      ],
    };

    const tx = await vaultFactory.createVault(vaultParams);
    const receipt = await tx.wait();

    const vaultEvent = receipt.logs
      .map((log) => {
        try {
          return vaultFactory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log?.name === "VaultCreated");

    const vaultAddress = vaultEvent?.args.vault;
    console.log("Vault created at:", vaultAddress);

    vault = Vault__factory.connect(vaultAddress, governance);

    await usdc.connect(governance).mint(alice.address, amount);
    await usdc.connect(alice).approve(vaultAddress, amount);
  });

  it("should create a vault successfully with initial strategies", async () => {
    const governanceAddress = await governance.getAddress();
    const vaultParams = {
      poolId: poolId + 1,
      asset: await usdc.getAddress(),
      tokenName: "Test Vault 2",
      tokenSymbol: "TVT2",
      profitMaxUnlockTime: timeUnlock,
      governance: governanceAddress,
      initialStrategies: [
        { strategy: await strategy1.getAddress(), addToQueue: true },
        { strategy: await strategy2.getAddress(), addToQueue: false },
      ],
    };

    const tx = await vaultFactory.createVault(vaultParams);
    const receipt = await tx.wait();

    const vaultEvent = receipt.logs
      .map((log) => {
        try {
          return vaultFactory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log?.name === "VaultCreated");

    expect(vaultEvent).to.exist;

    const vaultAddress = vaultEvent?.args.vault;
    console.log("New vault created:", vaultAddress);

    expect(await vaultFactory.isVault(vaultAddress)).to.be.true;
    expect((await vaultFactory.listAllVaults()).includes(vaultAddress)).to.be.true;

    const vaultContract = Vault__factory.connect(vaultAddress, governance);
    const strategyData1 = await vaultContract.strategies(await strategy1.getAddress());
    const strategyData2 = await vaultContract.strategies(await strategy2.getAddress());

    console.log("Strategy1 data:", strategyData1);
    console.log("Strategy2 data:", strategyData2);

    expect(strategyData1.activation).to.not.equal(0n);
    expect(strategyData2.activation).to.not.equal(0n);

    const defaultQueue = await vaultContract.getDefaultQueue();
    console.log("Default queue:", defaultQueue);

    expect(defaultQueue.includes(await strategy1.getAddress())).to.be.true;
    expect(defaultQueue.includes(await strategy2.getAddress())).to.be.false;
  });

  it("should return vaults via listAllVaults and isVault", async () => {
    const vaults = await vaultFactory.listAllVaults();
    console.log("All vaults:", vaults);

    expect(vaults.length).to.be.greaterThanOrEqual(1);

    const isValid = await vaultFactory.isVault(await vault.getAddress());
    console.log("Vault valid check:", isValid);
    expect(isValid).to.be.true;

    const isInvalid = await vaultFactory.isVault(alice.address);
    console.log("Alice isVault check:", isInvalid);
    expect(isInvalid).to.be.false;
  });

  it("should allow owner to rebalance debt", async () => {
    await vaultFactory.addStrategy(await vault.getAddress(), await strategy3.getAddress(), true);

    await expect(
      vaultFactory.reBalanceDebt(await vault.getAddress(), await strategy3.getAddress(), 1000n, 0n)
    ).to.emit(vaultFactory, "Rebalanced")
      .withArgs(await vault.getAddress(), await strategy3.getAddress());
  });

  it("should allow owner to add a strategy", async () => {
    await expect(
      vaultFactory.addStrategy(await vault.getAddress(), await strategy3.getAddress(), false)
    ).to.emit(vaultFactory, "StrategyAdded")
      .withArgs(await vault.getAddress(), await strategy3.getAddress(), false);

    const strategyData = await vault.strategies(await strategy3.getAddress());
    console.log("New strategy data:", strategyData);
    expect(strategyData.activation).to.not.equal(0n);
  });

  it("should revert when adding strategy with zero address", async () => {
    await expect(
      vaultFactory.addStrategy(await vault.getAddress(), ethers.ZeroAddress, true)
    ).to.be.revertedWith("Invalid strategy");
  });

  it("should allow owner to set max debt", async () => {
    await vaultFactory.addStrategy(await vault.getAddress(), await strategy3.getAddress(), true);

    await expect(
      vaultFactory.setMaxDebt(await vault.getAddress(), await strategy3.getAddress(), 5000n)
    ).to.not.be.reverted;
  });

  it("should revert reBalanceDebt if not vault", async () => {
    await expect(
      vaultFactory.reBalanceDebt(alice.address, await strategy1.getAddress(), 1000n, 0n)
    ).to.be.revertedWith("Not a valid vault");
  });

  it("should revert addStrategy if not vault", async () => {
    await expect(
      vaultFactory.addStrategy(alice.address, await strategy1.getAddress(), true)
    ).to.be.revertedWith("Not a valid vault");
  });

  it("should revert setMaxDebt if not vault", async () => {
    await expect(
      vaultFactory.setMaxDebt(alice.address, await strategy1.getAddress(), 1000n)
    ).to.be.revertedWith("Not a valid vault");
  });
});
