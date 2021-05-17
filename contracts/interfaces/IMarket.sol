// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title Interface of Market contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface IMarket {
    function acceptToken(address token) external;

    function revokeToken(address token) external;

    function updateFee(uint256 numerator, uint256 denominator) external;

    function createSellOrder(
        address nftAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        address token
    ) external;

    function cancelSellOrder(uint256 sellId) external;

    function buy(
        uint256 sellId,
        uint256 amount,
        address receiver,
        bytes calldata data
    ) external payable;

    function updatePrice(uint256 id, uint256 newPrice) external;

    function createExchangeOrder(
        address[] memory nftAddresses,
        uint256[] memory tokenIds,
        uint256[] memory nftAmounts,
        address[] memory tokens,
        uint256[] memory prices,
        address[] memory users,
        bytes[] memory data
    ) external;

    function cancelExchangeOrder(uint256 exchangeId) external;

    function exchange(
        uint256 exchangeId,
        uint256 destinationId,
        address receiver,
        bytes memory data
    ) external payable;

    function getFee() external view returns (uint256, uint256);
}
