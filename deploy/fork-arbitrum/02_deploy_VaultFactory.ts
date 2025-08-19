import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("----------------------------------------------------");
  log("Deploying VaultFactory and libraries...");

  // --- Deploy libraries ---
  const ERC20Logic = await deploy("ERC20Logic", { from: deployer, log: true });
  const ERC4626Logic = await deploy("ERC4626Logic", {
    from: deployer,
    log: true,
    libraries: { ERC20Logic: ERC20Logic.address },
  });
  const WithdrawLogic = await deploy("WithdrawLogic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20Logic.address,
      ERC4626Logic: ERC4626Logic.address,
    },
  });
  const UnlockSharesLogic = await deploy("UnlockSharesLogic", {
    from: deployer,
    log: true,
    libraries: { ERC20Logic: ERC20Logic.address },
  });
  const InitializeLogic = await deploy("InitializeLogic", {
    from: deployer,
    log: true,
  });
  const ConfiguratorLogic = await deploy("ConfiguratorLogic", {
    from: deployer,
    log: true,
  });
  const DebtLogic = await deploy("DebtLogic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20Logic.address,
      ERC4626Logic: ERC4626Logic.address,
      UnlockSharesLogic: UnlockSharesLogic.address,
    },
  });
  const DepositLogic = await deploy("DepositLogic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20Logic.address,
      ERC4626Logic: ERC4626Logic.address,
      DebtLogic: DebtLogic.address,
    },
  });

// Deploy Vault implementation trước (không proxy, chỉ để làm template)
const VaultImplementation = await deploy("Vault", {
  from: deployer,
  log: true,
  libraries: {
    ERC20Logic: ERC20LogicDeployment.address,
    ERC4626Logic: ERC4626LogicDeployment.address,
    InitializeLogic: InitializeLogicDeployment.address,
    DepositLogic: DepositLogicDeployment.address,
    WithdrawLogic: WithdrawLogicDeployment.address,
    UnlockSharesLogic: UnlockSharesLogicDeployment.address,
    DebtLogic: DebtLogicDeployment.address,
    ConfiguratorLogic: ConfiguratorLogicDeployment.address,
  },
});

// Deploy VaultFactory với 2 tham số
const factory = await deploy("VaultFactory", {
  from: deployer,
  args: [deployer, VaultImplementation.address],  
  log: true,
});


  log("----------------------------------------------------");
  log("VaultFactory deployed at:", factory.address);
  log("Vault implementation deployed at:", VaultImplementation.address);
};
export default func;
func.tags = ["factory"];
