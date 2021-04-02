// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../libraries/helpers/Errors.sol";
import "../libraries/types/DataTypes.sol";
import "../libraries/logic/SellOrderLogic.sol";
import "../interfaces/IAddressesProvider.sol";
import "../interfaces/INFTList.sol";
import "../libraries/helpers/ArrayLib.sol";

/**
 * @title SellOrderList contract
 * @dev The place user create sell order nft
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract SellOrderList is Initializable {
    using SafeMath for uint256;
    using SellOrderLogic for DataTypes.SellOrder;
    using ArrayLib for uint256[];

    IAddressesProvider public addressesProvider;
    INFTList public nftList;

    // All sell orders
    DataTypes.SellOrder[] internal _sellOrders;

    // The sell orders nft is of type ERC721 available
    uint256[] internal _availableSellOrders_ERC721;

    // The sell orders nft is of type ERC1155 available
    uint256[] internal _availableSellOrders_ERC1155;

    // All sell order of a user
    mapping(address => uint256[]) internal _sellerToOrders;

    // The available sell orders nft is of type ERC721  of a user
    mapping(address => uint256[]) internal _sellerToAvailableOrders_ERC721;

    // The available sell orders nft is of type ERC1155 of a user
    mapping(address => uint256[]) internal _sellerToAvailableOrders_ERC1155;

    // All sell orders of a nft address
    mapping(address => uint256[]) internal _nftToOrders;

    // The available sell orders of a nft address
    mapping(address => uint256[]) internal _nftToAvailableOrders;

    // All sell orders was purchased by user
    mapping(address => uint256[]) internal _buyerToSellOrders;

    // Latest sell order of a nft is of type ERC721
    // nftAddress => tokenId => latest sellId
    mapping(address => mapping(uint256 => uint256)) internal _inforToSellId_ERC721;

    // Latest sell order of a nft is of type ERC1155
    // seller => nftAddress => tokenId => latest sellId
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        internal _inforToSellId_ERC1155;

    event Initialized(address indexed provider);
    event SellOrderAdded(
        address indexed seller,
        uint256 sellId,
        address nftAddress,
        uint256 tokenId,
        uint256 price,
        address token
    );
    event SellOrderDeactive(uint256 indexed sellId);
    event SellOrderCompleted(uint256 indexed sellId, address buyer, uint256 amount);
    event PriceChanged(uint256 sellId, uint256 newPrice);

    modifier onlyMarket() {
        require(addressesProvider.getMarket() == msg.sender, Errors.CALLER_NOT_MARKET);
        _;
    }

    /**
     * @dev Function is invoked by the proxy contract when the SellOrderList contract is added to the
     * AddressesProvider of the market.
     * - Caching the address of the AddressesProvider in order to reduce gas consumption
     *   on subsequent operations
     * @param provider The address of the AddressesProvider
     **/
    function initialize(address provider) external initializer {
        addressesProvider = IAddressesProvider(provider);
        nftList = INFTList(addressesProvider.getNFTList());
        emit Initialized(provider);
    }

    /**
     * @dev Add sell order to the list
     * - Can only be called by Market
     * @param nftAddress The address of nft
     * @param tokenId The tokenId of nft
     * @param amount The amount of nft
     * @param seller The address of seller
     * @param price The unit price at which the seller wants to sell
     * @param token Token that the seller wants to be paid
     **/
    function addSellOrder(
        address nftAddress,
        uint256 tokenId,
        uint256 amount,
        address payable seller,
        uint256 price,
        address token
    ) external onlyMarket {
        uint256 sellId = _sellOrders.length;
        DataTypes.SellOrder memory sellOrder =
            SellOrderLogic.newSellOrder(sellId, nftAddress, tokenId, amount, seller, price, token);

        _addSellOrderToList(sellOrder);

        emit SellOrderAdded(seller, sellId, nftAddress, tokenId, price, token);
    }

    /**
     * @dev Deactive a sell order
     * - Can only be called by Market
     * @param sellId Sell order id
     */
    function deactiveSellOrder(uint256 sellId) external onlyMarket {
        _sellOrders[sellId].deactive();
        _removeSellOrderFromList(sellId);
        emit SellOrderDeactive(sellId);
    }

    /**
     * @dev Complete a sell order
     * - Can only be called by Market
     * @param sellId Sell order id
     * @param buyer Buyer address
     * @param amount The amount of nft purchased by the buyer
     */
    function completeSellOrder(
        uint256 sellId,
        address buyer,
        uint256 amount
    ) external onlyMarket {
        _sellOrders[sellId].complete(buyer, amount);
        _buyerToSellOrders[buyer].push(sellId);
        if (_sellOrders[sellId].soldAmount == _sellOrders[sellId].amount) {
            _sellOrders[sellId].isActive = false;
            _removeSellOrderFromList(sellId);
        }
        emit SellOrderCompleted(sellId, buyer, amount);
    }

    /**
     * @dev Update price of a sell order
     * - Can only be called by Market
     * @param sellId Sell order id
     * @param newPrice The new price of sell order
     */
    function updatePrice(uint256 sellId, uint256 newPrice) external onlyMarket {
        _sellOrders[sellId].updatePrice(newPrice);
        emit PriceChanged(sellId, newPrice);
    }

    /**
     * @dev Get information of a sell order by id
     * @param sellId Sell order id
     * @return Information of sell order
     */
    function getSellOrderById(uint256 sellId) external view returns (DataTypes.SellOrder memory) {
        return _sellOrders[sellId];
    }

    /**
     * @dev Get information of the sell orders by id list
     * @param idList The list of id of sell orders
     * @return Information of sell orders
     */
    function getSellOrdersByIdList(uint256[] memory idList)
        external
        view
        returns (DataTypes.SellOrder[] memory)
    {
        DataTypes.SellOrder[] memory result = new DataTypes.SellOrder[](idList.length);

        for (uint256 i = 0; i < idList.length; i++) {
            result[i] = _sellOrders[idList[i]];
        }

        return result;
    }

    /**
     * @dev Get information of the sell orders by range of id
     * @param fromId The start id
     * @param toId The end id
     * @return Information of the sell orders
     */
    function getSellOrdersByRange(uint256 fromId, uint256 toId)
        external
        view
        returns (DataTypes.SellOrder[] memory)
    {
        require(fromId >= 0 && toId < _sellOrders.length, Errors.RANGE_IS_INVALID);

        DataTypes.SellOrder[] memory result = new DataTypes.SellOrder[](toId.sub(fromId).add(1));

        for (uint256 i = fromId; i <= fromId; i++) {
            result[i] = _sellOrders[i];
        }

        return result;
    }

    /**
     * @dev Get all sell orders
     * @return Information of all sell orders
     */
    function getAllSellOrders() external view returns (DataTypes.SellOrder[] memory) {
        return _sellOrders;
    }

    /**
     * @dev Get the number of sell order
     * @return The number of sell order
     */
    function getSellOrderCount() external view returns (uint256) {
        return _sellOrders.length;
    }

    /**
     * @dev Get available sell orders
     */
    function getAvailableSellOrders()
        external
        view
        returns (DataTypes.SellOrder[] memory erc721, DataTypes.SellOrder[] memory erc1155)
    {
        DataTypes.SellOrder[] memory result_ERC721 =
            new DataTypes.SellOrder[](_availableSellOrders_ERC721.length);

        for (uint256 i = 0; i < _availableSellOrders_ERC721.length; i++) {
            result_ERC721[i] = _sellOrders[_availableSellOrders_ERC721[i]];
        }

        DataTypes.SellOrder[] memory result_ERC1155 =
            new DataTypes.SellOrder[](_availableSellOrders_ERC1155.length);

        for (uint256 i = 0; i < _availableSellOrders_ERC1155.length; i++) {
            result_ERC1155[i] = _sellOrders[_availableSellOrders_ERC1155[i]];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get list of id of available sell orders
     */
    function getAvailableSellOrdersIdList()
        external
        view
        returns (uint256[] memory erc721, uint256[] memory erc1155)
    {
        uint256[] memory result_ERC721 = new uint256[](_availableSellOrders_ERC721.length);

        for (uint256 i = 0; i < _availableSellOrders_ERC721.length; i++) {
            result_ERC721[i] = _availableSellOrders_ERC721[i];
        }

        uint256[] memory result_ERC1155 = new uint256[](_availableSellOrders_ERC1155.length);

        for (uint256 i = 0; i < _availableSellOrders_ERC1155.length; i++) {
            result_ERC1155[i] = _availableSellOrders_ERC1155[i];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get sell orders created by a user
     */
    function getAllSellOrdersByUser(address user)
        external
        view
        returns (DataTypes.SellOrder[] memory)
    {
        DataTypes.SellOrder[] memory result =
            new DataTypes.SellOrder[](_sellerToOrders[user].length);

        for (uint256 i = 0; i < _sellerToOrders[user].length; i++) {
            result[i] = _sellOrders[_sellerToOrders[user][i]];
        }
        return result;
    }

    /**
     * @dev Get list of id of sell orders of a user
     * @return List of id of sell orders of a user
     */
    function getAllSellOrdersIdListByUser(address user) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](_sellerToOrders[user].length);

        for (uint256 i = 0; i < _sellerToOrders[user].length; i++) {
            result[i] = _sellerToOrders[user][i];
        }
        return result;
    }

    /**
     * @dev Get available sell orders of a user
     */
    function getAvailableSellOrdersByUser(address user)
        external
        view
        returns (DataTypes.SellOrder[] memory erc721, DataTypes.SellOrder[] memory erc1155)
    {
        DataTypes.SellOrder[] memory result_ERC721 =
            new DataTypes.SellOrder[](_sellerToAvailableOrders_ERC721[user].length);
        for (uint256 i = 0; i < _sellerToAvailableOrders_ERC721[user].length; i++) {
            result_ERC721[i] = _sellOrders[_sellerToAvailableOrders_ERC721[user][i]];
        }

        DataTypes.SellOrder[] memory result_ERC1155 =
            new DataTypes.SellOrder[](_sellerToAvailableOrders_ERC1155[user].length);
        for (uint256 i = 0; i < _sellerToAvailableOrders_ERC1155[user].length; i++) {
            result_ERC1155[i] = _sellOrders[_sellerToAvailableOrders_ERC1155[user][i]];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get list of id of available sell orders of a user
     */
    function getAvailableSellOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory erc721, uint256[] memory erc1155)
    {
        uint256[] memory result_ERC721 =
            new uint256[](_sellerToAvailableOrders_ERC721[user].length);
        for (uint256 i = 0; i < _sellerToAvailableOrders_ERC721[user].length; i++) {
            result_ERC721[i] = _sellerToAvailableOrders_ERC721[user][i];
        }

        uint256[] memory result_ERC1155 =
            new uint256[](_sellerToAvailableOrders_ERC1155[user].length);
        for (uint256 i = 0; i < _sellerToAvailableOrders_ERC1155[user].length; i++) {
            result_ERC1155[i] = _sellerToAvailableOrders_ERC1155[user][i];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get sell orders of a nft address
     * @return The sell orders of a nft address
     */
    function getAllSellOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.SellOrder[] memory)
    {
        DataTypes.SellOrder[] memory result =
            new DataTypes.SellOrder[](_nftToOrders[nftAddress].length);

        for (uint256 i = 0; i < _nftToOrders[nftAddress].length; i++) {
            result[i] = _sellOrders[_nftToOrders[nftAddress][i]];
        }
        return result;
    }

    /**
     * @dev Get list of id of sell orders of a nft address
     * @return List of id of sell orders of a nft address
     */
    function getAllSellOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result = new uint256[](_nftToOrders[nftAddress].length);

        for (uint256 i = 0; i < _nftToOrders[nftAddress].length; i++) {
            result[i] = _nftToOrders[nftAddress][i];
        }
        return result;
    }

    /**
     * @dev Get availables sell orders of a nft address
     * @return The available sell orders of a nft address
     */
    function getAvailableSellOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.SellOrder[] memory)
    {
        DataTypes.SellOrder[] memory result =
            new DataTypes.SellOrder[](_nftToAvailableOrders[nftAddress].length);

        for (uint256 i = 0; i < _nftToAvailableOrders[nftAddress].length; i++) {
            result[i] = _sellOrders[_nftToAvailableOrders[nftAddress][i]];
        }

        return result;
    }

    /**
     * @dev Get list of id of available sell orders of a nft address
     * @return The list of id of available sell orders of a nft address
     */
    function getAvailableSellOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result = new uint256[](_nftToAvailableOrders[nftAddress].length);

        for (uint256 i = 0; i < _nftToAvailableOrders[nftAddress].length; i++) {
            result[i] = _nftToAvailableOrders[nftAddress][i];
        }

        return result;
    }

    /**
     * @dev Get sell orders was purchased by a user
     * @return The sell orders was purchased by a user
     */
    function getSellOrdersBoughtByUser(address user)
        external
        view
        returns (DataTypes.SellOrder[] memory)
    {
        DataTypes.SellOrder[] memory result =
            new DataTypes.SellOrder[](_buyerToSellOrders[user].length);

        for (uint256 i = 0; i < _buyerToSellOrders[user].length; i++) {
            result[i] = _sellOrders[_buyerToSellOrders[user][i]];
        }

        return result;
    }

    /**
     * @dev Get list of id of sell orders was purchased by a user
     * @return List of id of sell orders was purchased by a user
     */
    function getSellOrdersBoughtIdListByUser(address user)
        external
        view
        returns (uint256[] memory)
    {
        return _buyerToSellOrders[user];
    }

    /**
     * @dev Get latest sellId of a nft  is of type ERC721
     * @param nftAddress The address of nft contract
     * @param tokenId The tokenId of nft
     * @return found (true, false) and latest sellId
     */
    function getLatestSellId_ERC721(address nftAddress, uint256 tokenId)
        external
        view
        returns (bool found, uint256 id)
    {
        uint256 sellId = _inforToSellId_ERC721[nftAddress][tokenId];

        if (
            _sellOrders[sellId].nftAddress == nftAddress && _sellOrders[sellId].tokenId == tokenId
        ) {
            return (true, sellId);
        } else {
            return (false, sellId);
        }
    }

    /**
     * @dev Get latest sellId of a nft  is of type ERC1155
     * @param nftAddress The address of nft contract
     * @param tokenId The tokenId of nft
     * @return found (true, false) and latest sellId
     */
    function getLatestSellId_ERC1155(
        address seller,
        address nftAddress,
        uint256 tokenId
    ) external view returns (bool found, uint256 id) {
        uint256 sellId = _inforToSellId_ERC1155[seller][nftAddress][tokenId];

        if (
            _sellOrders[sellId].nftAddress == nftAddress &&
            _sellOrders[sellId].tokenId == tokenId &&
            _sellOrders[sellId].seller == seller
        ) {
            return (true, sellId);
        } else {
            return (false, sellId);
        }
    }

    /**
     * @dev Check sell order of a nft ERC721 is duplicate or not
     * @param nftAddress The address of nft contract
     * @param tokenId The tokenId of nft
     * @param seller The address of seller
     * @return found (true, false) and latest sellId
     */
    function checkDuplicate_ERC721(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool) {
        for (uint256 i = 0; i < _sellerToAvailableOrders_ERC721[seller].length; i++) {
            if (
                _sellOrders[_sellerToAvailableOrders_ERC721[seller][i]].nftAddress == nftAddress &&
                _sellOrders[_sellerToAvailableOrders_ERC721[seller][i]].tokenId == tokenId
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Check sell order of a nft ERC1155 is duplicate or not
     * @param nftAddress The address of nft contract
     * @param tokenId The tokenId of nft
     * @param seller The address of seller
     * @return found (true, false) and latest sellId
     */
    function checkDuplicate_ERC1155(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool) {
        for (uint256 i = 0; i < _sellerToAvailableOrders_ERC1155[seller].length; i++) {
            if (
                _sellOrders[_sellerToAvailableOrders_ERC1155[seller][i]].nftAddress ==
                nftAddress &&
                _sellOrders[_sellerToAvailableOrders_ERC1155[seller][i]].tokenId == tokenId
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Add sell order to
     - _sellOrders,
     - _availableSellOrders,
     - _sellerToOrders,
     - _sellerToAvailableOrders_ERC1155,
     - _sellerToAvailableOrders_ERC721,
     - _nftToOrders,
     - _nftToAvailableOrders
     * - internal function called inside addSellOrder() function
     * @param sellOrder sell order object
     */
    function _addSellOrderToList(DataTypes.SellOrder memory sellOrder) internal {
        uint256 sellId = sellOrder.sellId;

        _sellOrders.push(sellOrder);

        _sellerToOrders[sellOrder.seller].push(sellId);

        _nftToOrders[sellOrder.nftAddress].push(sellId);

        _nftToAvailableOrders[sellOrder.nftAddress].push(sellId);

        if (nftList.isERC1155(sellOrder.nftAddress) == true) {
            _availableSellOrders_ERC1155.push(sellId);
            _sellerToAvailableOrders_ERC1155[sellOrder.seller].push(sellId);
            _inforToSellId_ERC1155[sellOrder.seller][sellOrder.nftAddress][
                sellOrder.tokenId
            ] = sellId;
        } else {
            _availableSellOrders_ERC721.push(sellId);
            _sellerToAvailableOrders_ERC721[sellOrder.seller].push(sellId);
            _inforToSellId_ERC721[sellOrder.nftAddress][sellOrder.tokenId] = sellId;
        }
    }

    /**
     * @dev Remove sell order from
     - _availableSellOrders,
     - _sellerToAvailableOrders_ERC1155 or _sellerToAvailableOrders_ERC721,
     - _nftToAvailableOrders
     * - internal function called inside completeSellOrder() and deactiveSellOrder() function
     * @param sellId Id of sell order
     */
    function _removeSellOrderFromList(uint256 sellId) internal {
        DataTypes.SellOrder memory sellOrder = _sellOrders[sellId];

        _nftToAvailableOrders[sellOrder.nftAddress].removeAtValue(sellId);

        if (nftList.isERC1155(sellOrder.nftAddress) == true) {
            _availableSellOrders_ERC1155.removeAtValue(sellId);
            _sellerToAvailableOrders_ERC1155[sellOrder.seller].removeAtValue(sellId);
        } else {
            _availableSellOrders_ERC721.removeAtValue(sellId);
            _sellerToAvailableOrders_ERC721[sellOrder.seller].removeAtValue(sellId);
        }
    }
}
