import { ethers, deployments, getNamedAccounts } from "hardhat";
import { VaultFactory__factory, Vault__factory, ERC20Mintable__factory, MockStrategy__factory } from "../typechain-types";

async function main() {
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.getSigner(deployer);
  console.log("Deployer address:", deployer);
  const vaultFactoryDeployment = await deployments.get("VaultFactory");
  const vaultFactory = VaultFactory__factory.connect(vaultFactoryDeployment.address, signer);
  console.log("VaultFactory deployed at:", vaultFactoryDeployment.address);
  const usdcDeployment = await deployments.get("USDC");
  const usdc = ERC20Mintable__factory.connect(usdcDeployment.address, signer);
  console.log("USDC deployed at:", usdcDeployment.address);
  const MockStrategyFactory = await ethers.getContractFactory("MockStrategy", signer);
  const strategy = await MockStrategyFactory.deploy();
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  console.log("MockStrategy deployed at:", strategyAddress);
  await strategy.initialize(
    vaultFactoryDeployment.address,
    deployer,
    deployer,
    usdcDeployment.address,
    "Test Strategy",
    "TSTR"
  );
  console.log("MockStrategy initialized with vaultFactory:", vaultFactoryDeployment.address);
  const allVaults = await vaultFactory.listAllVaults();
  console.log("All existing vaults:", allVaults);
  if (allVaults.length > 0) {
    const vaultAddress = allVaults[0];
    const vault = Vault__factory.connect(vaultAddress, signer);
    console.log("Interacting with existing vault:", vaultAddress);
    const amount = ethers.parseUnits("1000", 6);
    await usdc.mint(deployer, amount);
    console.log(`Minted ${ethers.formatUnits(amount, 6)} USDC to deployer`);
    await usdc.approve(vaultAddress, amount);
    console.log(`Approved ${ethers.formatUnits(amount, 6)} USDC for vault`);
    await vault.deposit(amount, deployer);
    console.log(`Deposited ${ethers.formatUnits(amount, 6)} USDC to vault`);
    const vaultBalance = await vault.balanceOf(deployer);
    console.log(`Vault balance of deployer: ${ethers.formatUnits(vaultBalance, 6)} vault tokens`);
  }
  console.log("Creating new vault...");
  const vaultParams = {
    poolId: 2,
    asset: usdcDeployment.address,
    tokenName: "New Vault",
    tokenSymbol: "NVLT",
    profitMaxUnlockTime: 7 * 24 * 60 * 60,
    governance: deployer,
    initialStrategies: [{ strategy: strategyAddress, addToQueue: true }],
  };

  const tx = await vaultFactory.createVault(vaultParams);
  const receipt = await tx.wait();
  const vaultCreatedEvent = receipt.logs
    .map((log) => {
      try {
        return vaultFactory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((log) => log?.name === "VaultCreated");

  if (vaultCreatedEvent) {
    const newVaultAddress = vaultCreatedEvent.args.vault;
    console.log("New vault created at:", newVaultAddress);
    console.log("New vault poolId:", vaultCreatedEvent.args.poolId.toString());

    const newVault = Vault__factory.connect(newVaultAddress, signer);
    const strategyData = await newVault.strategies(strategyAddress);
    if (strategyData.activation == 0) {
      await vaultFactory.addStrategy(newVaultAddress, strategyAddress, true);
      console.log(`Added strategy ${strategyAddress} to new vault`);
    } else {
      console.log(`Strategy ${strategyAddress} already active in new vault`);
    }
  //   const depositAmount = ethers.parseUnits("500", 6);
  //   await usdc.mint(deployer, depositAmount);
  //   await usdc.approve(newVaultAddress, depositAmount);
  //   await newVault.deposit(depositAmount, deployer);
  //   console.log(`Deposited ${ethers.formatUnits(depositAmount, 6)} USDC to new vault`);
  //   const vaultBalance = await usdc.balanceOf(newVaultAddress);
  //   console.log(`Vault USDC balance after deposit: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
  //   const investAmount = ethers.parseUnits("200", 6);
  //   await vaultFactory.reBalanceDebt(newVaultAddress, strategyAddress, investAmount, 0n);
  //   console.log(`Rebalanced debt: ${ethers.formatUnits(investAmount, 6)} USDC to strategy`);
  //   const strategyBalance = await usdc.balanceOf(strategyAddress);
  //   console.log(`Strategy USDC balance after reBalanceDebt: ${ethers.formatUnits(strategyBalance, 6)} USDC`);
  //   const updatedStrategyData = await newVault.strategies(strategyAddress);
  //   console.log("Strategy data after rebalance:", {
  //     activation: updatedStrategyData.activation.toString(),
  //     currentDebt: ethers.formatUnits(updatedStrategyData.currentDebt, 6),
  //     maxDebt: ethers.formatUnits(updatedStrategyData.maxDebt, 6),
  //   });
  //   const initialTotalIdle = await strategy.totalIdle();
  //   const initialTotalLocked = await strategy.totalLocked();
  //   console.log("MockStrategy state before harvest:", {
  //     totalIdle: ethers.formatUnits(initialTotalIdle, 6),
  //     totalLocked: ethers.formatUnits(initialTotalLocked, 6),
  //   });
  //   try {
  //     await strategy.connect(signer).harvest();
  //     console.log("Harvest called to update totalIdle");
  //   } catch (error) {
  //     console.error("Harvest failed:", error.message);
  //   }
  //   const totalIdle = await strategy.totalIdle();
  //   const totalLocked = await strategy.totalLocked();
  //   console.log("MockStrategy state after harvest:", {
  //     totalIdle: ethers.formatUnits(totalIdle, 6),
  //     totalLocked: ethers.formatUnits(totalLocked, 6),
  //   });
  //   const profit = ethers.parseUnits("50", 6);
  //   if ((await usdc.balanceOf(strategyAddress)) > profit) {
  //     await strategy.connect(signer).lock(profit);
  //     console.log(`Locked ${ethers.formatUnits(profit, 6)} USDC as simulated profit`);
  //   } else {
  //     console.log("Insufficient balance to lock profit");
  //   }
  //   const finalStrategyData = await newVault.strategies(strategyAddress);
  //   console.log("Strategy data after lock:", {
  //     activation: finalStrategyData.activation.toString(),
  //     currentDebt: ethers.formatUnits(finalStrategyData.currentDebt, 6),
  //     maxDebt: ethers.formatUnits(finalStrategyData.maxDebt, 6),
  //   });
  //   const finalTotalIdle = await strategy.totalIdle();
  //   const finalTotalLocked = await strategy.totalLocked();
  //   console.log("MockStrategy final state:", {
  //     totalIdle: ethers.formatUnits(finalTotalIdle, 6),
  //     totalLocked: ethers.formatUnits(finalTotalLocked, 6),
  //   });
  // } else {
  //   console.error("Failed to create vault: VaultCreated event not found");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });