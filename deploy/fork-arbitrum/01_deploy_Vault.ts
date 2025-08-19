import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ROLES } from "../../utils/helper";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, get, read, execute } = deployments;
  const { deployer, agent } = await getNamedAccounts();

  let usdc = await get("USDC");
  let timeUnlock = 7 * 24 * 60 * 60;
  let ERC20LogicDeployment = await deploy("ERC20Logic", {
    from: deployer,
    log: true,
  });

  let ERC4626LogicDeployment = await deploy("ERC4626Logic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20LogicDeployment.address,
    },
  });

  let WithdrawLogicDeployment = await deploy("WithdrawLogic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20LogicDeployment.address,
      ERC4626Logic: ERC4626LogicDeployment.address,
    },
  });

  let UnlockSharesLogicDeployment = await deploy("UnlockSharesLogic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20LogicDeployment.address,
    },
  });

  let InitializeLogicDeployment = await deploy("InitializeLogic", {
    from: deployer,
    log: true,
  });

  let ConfiguratorLogicDeployment = await deploy("ConfiguratorLogic", {
    from: deployer,
    log: true,
  });

  let DebtLogicDeployment = await deploy("DebtLogic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20LogicDeployment.address,
      ERC4626Logic: ERC4626LogicDeployment.address,
      UnlockSharesLogic: UnlockSharesLogicDeployment.address,
    },
  });

  let DepositLogicDeployment = await deploy("DepositLogic", {
    from: deployer,
    log: true,
    libraries: {
      ERC20Logic: ERC20LogicDeployment.address,
      ERC4626Logic: ERC4626LogicDeployment.address,
      DebtLogic: DebtLogicDeployment.address,
    },
  });
  // const factory = await deployments.get("VaultFactory");
 await deploy("Vault", {
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

  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.ACCOUNTANT_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.DEPOSIT_LIMIT_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.DEBT_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.DEBT_PURCHASER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.EMERGENCY_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.GOVERNANCE_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.MAX_DEBT_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.MINIMUM_IDLE_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.PROFIT_UNLOCK_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.REPORTING_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.REVOKE_STRATEGY_MANAGER, deployer);
  await execute("Vault", { from: deployer, log: true }, "grantRole", ROLES.WITHDRAW_LIMIT_MANAGER, deployer);
};
deploy.tags = ["vault"];

export default deploy;
