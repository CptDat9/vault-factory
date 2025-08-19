// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IVaultFactory.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../protocol/Vault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VaultFactory is IVaultFactory, Ownable {
    address[] private _allVaults;
    mapping(address => bool) private _isVault;
    address public immutable vaultImplementation;

    constructor(
        address initialOwner,
        address _vaultImplementation
    ) Ownable(initialOwner) {
        require(
            _vaultImplementation != address(0),
            "Implementation khong hop le"
        );
        vaultImplementation = _vaultImplementation;
    }

    function allVaults(
        uint256 index
    ) external view override returns (address vault) {
        return _allVaults[index];
    }

    function listAllVaults() external view override returns (address[] memory) {
        return _allVaults;
    }

    function isVault(address vault) external view override returns (bool) {
        return _isVault[vault];
    }

    function createVault(
        CreateVaultParams memory params
    ) external override returns (address vault) {
        require(address(params.asset) != address(0), "Invalid asset address");
        require(params.governance != address(0), "Not governance address");
        bytes memory initData = abi.encodeWithSelector(
            Vault.initialize.selector,
            params.asset,
            params.tokenName,
            params.tokenSymbol,
            params.profitMaxUnlockTime,
            params.governance,
            address(this)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(vaultImplementation, initData);
        vault = address(proxy);
        _allVaults.push(vault);
        _isVault[vault] = true;
        for (uint256 i = 0; i < params.initialStrategies.length; i++) {
            address strat = params.initialStrategies[i].strategy;
            require(strat != address(0), "Invalid strategy");
            Vault(vault).addStrategy(
                strat,
                params.initialStrategies[i].addToQueue
            );
            emit StrategyAdded(
                vault,
                strat,
                params.initialStrategies[i].addToQueue
            );
        }
        emit VaultCreated(
            params.poolId,
            msg.sender,
            vault,
            address(params.asset)
        );
        return vault;
    }

    function reBalanceDebt(
        address vault,
        address strategy,
        uint256 targetDebt,
        uint256 maxLoss
    ) external override onlyOwner {
        require(_isVault[vault], "Not a valid vault");
        Vault(vault).updateDebt(strategy, targetDebt, maxLoss);
        emit Rebalanced(vault, strategy);
    }

    function addStrategy(
        address vault,
        address strategy,
        bool addToQueue
    ) external override onlyOwner {
        require(_isVault[vault], "Not a valid vault");
        require(strategy != address(0), "Invalid strategy");
        Vault(vault).addStrategy(strategy, addToQueue);
        emit StrategyAdded(vault, strategy, addToQueue);
    }

    function setMaxDebt(
        address vault,
        address strategy,
        uint256 newMaxDebt
    ) external override onlyOwner {
        require(_isVault[vault], "Not a valid vault");
        Vault(vault).updateMaxDebtForStrategy(strategy, newMaxDebt);
    }

    function rebalanceBetweenVaults(
        address fromVault,
        address toVault,
        uint256 targetDebt
    ) external override onlyOwner {
        require(_isVault[fromVault] && _isVault[toVault], "Invalid vaults");
        require(fromVault != toVault, "Same vault");
        IERC20 asset = IERC20(Vault(fromVault).asset());
        require(
            address(asset) == address(Vault(toVault).asset()),
            "Different assets"
        );
        uint256 currentAssets = Vault(fromVault).totalAssets();
        require(currentAssets > targetDebt, "No excess to move");
        uint256 amountToMove = currentAssets - targetDebt;
        uint256 withdrawn = Vault(fromVault).withdraw(
            amountToMove,
            address(this),
            msg.sender
        );
        asset.approve(toVault, withdrawn);
        Vault(toVault).deposit(withdrawn, address(this));
        emit VaultsRebalanced(fromVault, toVault, withdrawn);
    }
}
