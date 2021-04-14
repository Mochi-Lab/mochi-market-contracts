// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title Interface of Vault contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface IVault {
    function setupRewardToken(address token) external;

    function deposit(
        address nftAddress,
        address seller,
        address buyer,
        address token,
        uint256 amount
    ) external payable;

    function withdrawFund(
        address token,
        uint256 amount,
        address payable receiver
    ) external;

    function claimRoyalty(
        address nftAddress,
        address token,
        uint256 amount,
        address payable receiver
    ) external;

    function withrawRewardToken(
        address rewardToken,
        uint256 amount,
        address receiver
    ) external;

    function setupRewardParameters(
        uint256 periodOfCycle,
        uint256 numberOfCycle,
        uint256 startTime,
        uint256 firstRate
    ) external;

    function updateRoyaltyParameters(uint256 numerator, uint256 denominator) external;

    function getCurrentRate() external view returns (uint256);

    function getCurrentPeriod() external view returns (uint256);

    function getRewardToken(address token) external view returns (address);

    function getRewardTokenBalance(address user, address rewardToken)
        external
        view
        returns (uint256);

    function getMochiFund(address token) external view returns (uint256);

    function getRoyaltyParameters() external view returns (uint256, uint256);

    function checkRewardIsActive() external view returns (bool);
}
