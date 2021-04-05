// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../libraries/types/DataTypes.sol";

/**
 * @title Interface of SellOrderList contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface ISellOrderList {
    function addSellOrder(
        address nftAddress,
        uint256 tokenId,
        uint256 amount,
        address payable seller,
        uint256 price,
        address token
    ) external;

    function deactiveSellOrder(uint256 sellId) external;

    function completeSellOrder(
        uint256 sellId,
        address buyer,
        uint256 amount
    ) external;

    function updatePrice(uint256 sellId, uint256 newPrice) external;

    function getSellOrderById(uint256 sellId) external view returns (DataTypes.SellOrder memory);

    function getSellOrdersByIdList(uint256[] memory idList)
        external
        view
        returns (DataTypes.SellOrder[] memory);

    function getSellOrdersByRange(uint256 fromId, uint256 toId)
        external
        view
        returns (DataTypes.SellOrder[] memory);

    function getAllSellOrders() external view returns (DataTypes.SellOrder[] memory);

    function getSellOrderCount() external view returns (uint256);

    function getAvailableSellOrders()
        external
        view
        returns (DataTypes.SellOrder[] memory erc721, DataTypes.SellOrder[] memory erc1155);

    function getAvailableSellOrdersIdList()
        external
        view
        returns (uint256[] memory erc721, uint256[] memory erc1155);

    function getAllSellOrdersByUser(address user)
        external
        view
        returns (DataTypes.SellOrder[] memory);

    function getAllSellOrdersIdListByUser(address user) external view returns (uint256[] memory);

    function getAvailableSellOrdersByUser(address user)
        external
        view
        returns (DataTypes.SellOrder[] memory erc721, DataTypes.SellOrder[] memory erc1155);

    function getAvailableSellOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory erc721, uint256[] memory erc1155);

    function getAllSellOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.SellOrder[] memory);

    function getAllSellOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory);

    function getAvailableSellOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.SellOrder[] memory);

    function getAvailableSellOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory);

    function getSellOrdersBoughtByUser(address user)
        external
        view
        returns (DataTypes.SellOrder[] memory);

    function getSellOrdersBoughtIdListByUser(address user)
        external
        view
        returns (uint256[] memory);

    function getLatestSellId_ERC721(address nftAddress, uint256 tokenId)
        external
        view
        returns (bool found, uint256 id);

    function getLatestSellId_ERC1155(
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
