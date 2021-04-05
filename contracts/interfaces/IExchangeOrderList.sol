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

    function deactiveExchangeOrder(uint256 exchangeId) external;

    function completeExchangeOrder(
        uint256 exchangeId,
        uint256 destinationId,
        address buyer
    ) external;

    function getExchangeOrderById(uint256 exchangeId)
        external
        view
        returns (DataTypes.ExchangeOrder memory);

    function getExchangeOrdersByIdList(uint256[] memory idList)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory);

    function getAllExchangeOrders() external view returns (DataTypes.ExchangeOrder[] memory);

    function getExchangeOrderCount() external view returns (uint256);

    function getAvailableExchangeOrders()
        external
        view
        returns (DataTypes.ExchangeOrder[] memory, DataTypes.ExchangeOrder[] memory);

    function getAvailableExchangeOrdersIdList()
        external
        view
        returns (uint256[] memory, uint256[] memory);

    function getAllExchangeOrdersByUser(address user)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory);

    function getAllExchangeOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory);

    function getAvailableExchangeOrdersByUser(address user)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory, DataTypes.ExchangeOrder[] memory);

    function getAvailableExchangeOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory, uint256[] memory);

    function getAllExchangeOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory);

    function getAvailableExchangeOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory);

    function getAllExchangeOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory);

    function getAvailableExchangeOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory);

    function getExchangeOrdersBoughtByUser(address user)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory);

    function getExchangeOrdersBoughtIdListByUser(address user)
        external
        view
        returns (uint256[] memory);

    function getLatestExchangeId_ERC721(address nftAddress, uint256 tokenId)
        external
        view
        returns (bool found, uint256 id);

    function getLatestExchangeId_ERC1155(
        address seller,
        address nftAddress,
        uint256 tokenId
    ) external view returns (bool found, uint256 id);

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
}
