// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../libraries/types/DataTypes.sol";

/**
 * @title Interface of ExchangeOrderList contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface IExchangeOrderList {
    function addExchangeOrder(
        address[] memory nftAddresses,
        uint256[] memory tokenIds,
        uint256[] memory nftAmounts,
        address[] memory tokens,
        uint256[] memory prices,
        address[] memory users,
        bytes[] memory datas
    ) external;

    function checkDuplicate_ERC721(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool);

    function checkDuplicate_ERC1155(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool);

    function deactiveExchangeOrder(uint256 exchangeId) external;

    function getExchangeOrderById(uint256 exchangeId)
        external
        view
        returns (DataTypes.ExchangeOrder memory);

    function completeExchangeOrder(
        uint256 exchangeId,
        uint256 destinationId,
        address buyer
    ) external;
}
