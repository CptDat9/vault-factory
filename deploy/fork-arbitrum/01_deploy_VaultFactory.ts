import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("Deploying libraries...");
  const ERC20Logic = await deploy("ERC20Logic", { from: deployer, log: true });
  const ERC4626Logic = await deploy("ERC4626Logic", {
    from: deployer,
    log: true,
    libraries: { ERC20Logic: ERC20Logic.address },
  });
  const WithdrawLogic = await deploy("WithdrawLogic", {
    from: deployer,
    log: true,
    libraries: { ERC20Logic: ERC20Logic.address, ERC4626Logic: ERC4626Logic.address },
  });
  const UnlockSharesLogic = await deploy("UnlockSharesLogic", {
    from: deployer,
    log: true,
    libraries: { ERC20Logic: ERC20Logic.address },
  });
  const InitializeLogic = await deploy("InitializeLogic", { from: deployer, log: true });
  const ConfiguratorLogic = await deploy("ConfiguratorLogic", { from: deployer, log: true });
  const DebtLogic = await deploy("DebtLogic", {
    from: deployer,
    log: true,
    libraries: { ERC20Logic: ERC20Logic.address, ERC4626Logic: ERC4626Logic.address, UnlockSharesLogic: UnlockSharesLogic.address },
  });
  const DepositLogic = await deploy("DepositLogic", {
    from: deployer,
    log: true,
    libraries: { ERC20Logic: ERC20Logic.address, ERC4626Logic: ERC4626Logic.address, DebtLogic: DebtLogic.address },
  });

  log("Deploying Vault Implementation...");
  await deploy("Vault_Implementation", {
    contract: "Vault",
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20Logic.address,
      ERC4626Logic: ERC4626Logic.address,
      InitializeLogic: InitializeLogic.address,
      DepositLogic: DepositLogic.address,
      WithdrawLogic: WithdrawLogic.address,
      UnlockSharesLogic: UnlockSharesLogic.address,
      DebtLogic: DebtLogic.address,
      ConfiguratorLogic: ConfiguratorLogic.address,
    },
  });

  log("Deploying VaultFactory...");
  await deploy("VaultFactory", {
    from: deployer,
    args: [deployer, (await deployments.get("Vault_Implementation")).address],
    log: true,
  });
};

deploy.tags = ["VaultFactory"];
deploy.dependencies = ["mock"];
export default deploy;
