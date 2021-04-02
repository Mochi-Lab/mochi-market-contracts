// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

/**
 * @title Interface of Vault contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface IVault {
    function deposit(
        address nftAddress,
        address seller,
        address buyer,
        address token,
        uint256 amount
    ) external payable;

    function setupRewardToken(address token) external;
}
