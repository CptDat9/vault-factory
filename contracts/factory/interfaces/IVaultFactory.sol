// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVaultFactory {
    // Structs
    struct StrategyConfig {
        address strategy; // Địa chỉ của strategy
        bool addToQueue; // Có thêm vào default queue hay không
    }
/* 
    Hien tai dang dung struct de tao 1 vault OmniFarmingV2, 
    co the can sua doi sau de rut gon params
 */
/* 
    Struct AgentVaultParams{
        IERC20 asset;
        string name;
        string symbol;
        address agent; // vai tro owner, governances
    }
*/
    struct CreateVaultParams {
        string agentName;              // ID to map group/pool
        IERC20 asset;                  // Underlying asset
        string tokenName;              // ERC20 name of the vault
        string tokenSymbol;            // ERC20 symbol of the vault
        uint256 profitMaxUnlockTime;   // Max time to unlock profits
        address governance;            // Governance address for the vault
    }

    // Events
    event VaultCreated(
        string indexed agentName,
        address indexed creator,
        address vault,
        address asset
    );
    event StrategyAdded(address indexed vault, address indexed strategy, bool addToQueue);
    event VaultsRebalanced(address indexed fromVault, address indexed toVault, uint256 amount);

    // View Functions
    function allVaults(uint256 index) external view returns (address vault);
    function listAllVaults() external view returns (address[] memory);
    function isVault(address vault) external view returns (bool);

    // Functions
    function createVault(CreateVaultParams memory params) external returns (address vault);
    function addStrategy(address vault, address strategy, bool addToQueue) external;
    function rebalanceBetweenVaults(address fromVault, address toVault, uint256 targetDebt) external;
}