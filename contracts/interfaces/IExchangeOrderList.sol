// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../libraries/types/ExchangeOrderType.sol";

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
        returns (ExchangeOrderType.ExchangeOrder memory);

    function getExchangeOrdersByIdList(uint256[] memory idList)
        external
        view
        returns (ExchangeOrderType.ExchangeOrder[] memory);

    function getAllExchangeOrders()
        external
        view
        returns (ExchangeOrderType.ExchangeOrder[] memory);

    function getExchangeOrderCount() external view returns (uint256);

    function getAvailableExchangeOrders()
        external
        view
        returns (
            ExchangeOrderType.ExchangeOrder[] memory,
            ExchangeOrderType.ExchangeOrder[] memory
        );

    function getAvailableExchangeOrdersIdList()
        external
        view
        returns (uint256[] memory, uint256[] memory);

    function getAllExchangeOrdersByUser(address user)
        external
        view
        returns (ExchangeOrderType.ExchangeOrder[] memory);

    function getAllExchangeOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory);

    function getAvailableExchangeOrdersByUser(address user)
        external
        view
        returns (
            ExchangeOrderType.ExchangeOrder[] memory,
            ExchangeOrderType.ExchangeOrder[] memory
        );

    function getAvailableExchangeOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory, uint256[] memory);

    function getAllExchangeOrdersByNftAddress(address nftAddress)
        external
        view
        returns (ExchangeOrderType.ExchangeOrder[] memory);

    function getAvailableExchangeOrdersByNftAddress(address nftAddress)
        external
        view
        returns (ExchangeOrderType.ExchangeOrder[] memory);

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
        returns (ExchangeOrderType.ExchangeOrder[] memory);

    function getExchangeOrdersBoughtIdListByUser(address user)
        external
        view
        returns (uint256[] memory);

    function getLatestExchangeIdERC721(address nftAddress, uint256 tokenId)
        external
        view
        returns (bool found, uint256 id);

    function getLatestExchangeIdERC1155(
        address seller,
        address nftAddress,
        uint256 tokenId
    ) external view returns (bool found, uint256 id);

    function checkDuplicateERC721(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool);

    function checkDuplicateERC1155(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool);
}
