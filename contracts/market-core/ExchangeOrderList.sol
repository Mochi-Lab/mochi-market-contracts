// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../libraries/helpers/Errors.sol";
import "../libraries/types/DataTypes.sol";
import "../libraries/logic/ExchangeOrderLogic.sol";
import "../interfaces/IAddressesProvider.sol";
import "../interfaces/INFTList.sol";
import "../libraries/helpers/ArrayLib.sol";

/**
 * @title ExchangeOrderList contract
 * @dev The place for users to create a nft exchange order and purchases an exchange order
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract ExchangeOrderList is Initializable {
    using SafeMath for uint256;
    using ExchangeOrderLogic for DataTypes.ExchangeOrder;
    using ArrayLib for uint256[];

    IAddressesProvider public addressesProvider;
    INFTList public nftList;

    // All exchange orders
    DataTypes.ExchangeOrder[] internal _exchangeOrders;

    // The exchange orders nft is of type ERC721 available
    uint256[] internal _availableExchangeOrders_ERC721;

    // The exchange orders nft is of type ERC1155 available
    uint256[] internal _availableExchangeOrders_ERC1155;

    // All exchange order of a user
    mapping(address => uint256[]) internal _sellerToOrders;

    // The exchange orders nft is of type ERC721 available of a user
    mapping(address => uint256[]) internal _sellerToAvailableOrders_ERC721;

    // The exchange orders nft is of type ERC1155 available of a user
    mapping(address => uint256[]) internal _sellerToAvailableOrders_ERC1155;

    // All exchange orders of a nft address
    mapping(address => uint256[]) internal _nftToOrders;

    // The available exchange orders of a nft address
    mapping(address => uint256[]) internal _nftToAvailableOrders;

    // The exchange orders was purchased by a user
    mapping(address => uint256[]) internal _buyers;

    // Latest exchange order of a nft is of type ERC721
    // nftAddress => tokenId => latest exchangeId
    mapping(address => mapping(uint256 => uint256))
        internal _inforToExchangeId_ERC721;

    // Latest exchange order of a nft is of type ERC721
    // seller => nftAddress => tokenId => latest exchangeId
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        internal _inforToExchangeId_ERC1155;

    event Initialized(address indexed provider, address nftAddress);

    event ExchangeOrderAdded(
        address indexed seller,
        uint256 exchangeId,
        address[] nftAddresses,
        uint256[] tokenIds,
        uint256[] nftAmounts,
        address[] tokens,
        uint256[] prices,
        bytes[] datas
    );

    event ExchangeOrderDeactive(uint256 indexed exchangeId);

    event ExchangeOrderCompleted(
        uint256 indexed exchangeId,
        uint256 destinationId,
        address buyer
    );

    modifier onlyMarket() {
        require(
            addressesProvider.getMarket() == msg.sender,
            Errors.CALLER_NOT_MARKET
        );
        _;
    }

    /**
     * @dev Function is invoked by the proxy contract when the ExchangeOrderList contract is added to the
     * AddressesProvider of the market.
     * - Caching the address of the AddressesProvider in order to reduce gas consumption
     *   on subsequent operations
     * @param provider The address of the AddressesProvider
     **/
    function initialize(address provider) external initializer {
        addressesProvider = IAddressesProvider(provider);
        nftList = INFTList(addressesProvider.getNFTList());
        emit Initialized(provider, address(nftList));
    }

    /**
     * @dev Add an exchange order to the list
     * - Can only be called by Market
     * @param nftAddresses The addresses of source nft and destination nft
     * @param tokenIds The tokenIds of source nft and destination nft
     * @param nftAmounts The amount of source nft and destination nft
     * @param tokens The token that seller wants to be paid for
     * @param prices The price that seller wants
     * @param users The users who create or join exchange
     * @param datas Calldata that seller wants to execute when he receives destination nft
     **/
    function addExchangeOrder(
        address[] memory nftAddresses,
        uint256[] memory tokenIds,
        uint256[] memory nftAmounts,
        address[] memory tokens,
        uint256[] memory prices,
        address[] memory users,
        bytes[] memory datas
    ) external onlyMarket {
        uint256 exchangeId = _exchangeOrders.length;

        uint256[] memory times;

        DataTypes.ExchangeOrder memory order =
            ExchangeOrderLogic.newExchangeOrder(
                exchangeId,
                nftAddresses,
                tokenIds,
                nftAmounts,
                tokens,
                prices,
                users,
                times,
                datas
            );

        _exchangeOrders.push(order);
        _exchangeOrders[exchangeId].addTimestamp(block.timestamp);
        _addExchangeOrderToList(order);

        emit ExchangeOrderAdded(
            users[0],
            exchangeId,
            nftAddresses,
            tokenIds,
            nftAmounts,
            tokens,
            prices,
            datas
        );
    }

    /**
     * @dev Deactive an exchange order
     * - Can only be called by Market
     * @param exchangeId Exchange order id
     */
    function deactiveExchangeOrder(uint256 exchangeId) external onlyMarket {
        _exchangeOrders[exchangeId].deactive();
        _removeExchangeOrderFromList(exchangeId);

        ExchangeOrderDeactive(_exchangeOrders[exchangeId].exchangeId);
    }

    /**
     * @dev Complete an exchange order
     * - Can only be called by Market
     * @param exchangeId Exchange order id
     * @param buyer Buyer address
     */
    function completeExchangeOrder(
        uint256 exchangeId,
        uint256 destinationId,
        address buyer
    ) external onlyMarket {
        _exchangeOrders[exchangeId].complete(buyer);
        _buyers[buyer].push(exchangeId);
        _removeExchangeOrderFromList(exchangeId);

        emit ExchangeOrderCompleted(exchangeId, destinationId, buyer);
    }

    /**
     * @dev Get information of an exchange order by id
     * @param exchangeId Exchange order id
     * @return Exchange order information
     */
    function getExchangeOrderById(uint256 exchangeId)
        external
        view
        returns (DataTypes.ExchangeOrder memory)
    {
        return _exchangeOrders[exchangeId];
    }

    /**
     * @dev Get information of the exchange orders by list of ids
     * @param idList The list of ids of exchange orders
     * @return Exchange orders information
     */
    function getExchangeOrdersByIdList(uint256[] memory idList)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory)
    {
        DataTypes.ExchangeOrder[] memory result =
            new DataTypes.ExchangeOrder[](idList.length);

        for (uint256 i = 0; i < idList.length; i++) {
            result[i] = _exchangeOrders[idList[i]];
        }

        return result;
    }

    /**
     * @dev Get all exchange order
     * @return Information of all exchange orders
     */
    function getAllExchangeOrders()
        external
        view
        returns (DataTypes.ExchangeOrder[] memory)
    {
        return _exchangeOrders;
    }

    /**
     * @dev Get the number of exchange orders
     * @return The number of exchange orders
     */
    function getExchangeOrderCount() external view returns (uint256) {
        return _exchangeOrders.length;
    }

    /**
     * @dev Get available exchange orders
     * @return The available exchange orders
     */
    function getAvailableExchangeOrders()
        external
        view
        returns (
            DataTypes.ExchangeOrder[] memory,
            DataTypes.ExchangeOrder[] memory
        )
    {
        DataTypes.ExchangeOrder[] memory result_ERC721 =
            new DataTypes.ExchangeOrder[](
                _availableExchangeOrders_ERC721.length
            );

        for (uint256 i = 0; i < _availableExchangeOrders_ERC721.length; i++) {
            result_ERC721[i] = _exchangeOrders[
                _availableExchangeOrders_ERC721[i]
            ];
        }

        DataTypes.ExchangeOrder[] memory result_ERC1155 =
            new DataTypes.ExchangeOrder[](
                _availableExchangeOrders_ERC1155.length
            );

        for (uint256 i = 0; i < _availableExchangeOrders_ERC1155.length; i++) {
            result_ERC1155[i] = _exchangeOrders[
                _availableExchangeOrders_ERC1155[i]
            ];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get list of id of available exchange orders
     * @return The list of id of available exchange orders
     */
    function getAvailableExchangeOrdersIdList()
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        uint256[] memory result_ERC721 =
            new uint256[](_availableExchangeOrders_ERC721.length);

        for (uint256 i = 0; i < _availableExchangeOrders_ERC721.length; i++) {
            result_ERC721[i] = _availableExchangeOrders_ERC721[i];
        }

        uint256[] memory result_ERC1155 =
            new uint256[](_availableExchangeOrders_ERC1155.length);

        for (uint256 i = 0; i < _availableExchangeOrders_ERC1155.length; i++) {
            result_ERC1155[i] = _availableExchangeOrders_ERC1155[i];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get exchanges orders of a user
     * @return The exchange orders of a user
     */
    function getAllExchangeOrdersByUser(address user)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory)
    {
        DataTypes.ExchangeOrder[] memory result =
            new DataTypes.ExchangeOrder[](_sellerToOrders[user].length);

        for (uint256 i = 0; i < _sellerToOrders[user].length; i++) {
            result[i] = _exchangeOrders[_sellerToOrders[user][i]];
        }
        return result;
    }

    /**
     * @dev Get list of ids of the exchange orders of a user
     * @return The list of ids of the exchange orders of a user
     */
    function getAllExchangeOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result = new uint256[](_sellerToOrders[user].length);

        for (uint256 i = 0; i < _sellerToOrders[user].length; i++) {
            result[i] = _sellerToOrders[user][i];
        }
        return result;
    }

    /**
     * @dev Get available exchange orders of a user
     * @return The available exchange orders of a user
     */
    function getAvailableExchangeOrdersByUser(address user)
        external
        view
        returns (
            DataTypes.ExchangeOrder[] memory,
            DataTypes.ExchangeOrder[] memory
        )
    {
        DataTypes.ExchangeOrder[] memory result_ERC721 =
            new DataTypes.ExchangeOrder[](
                _sellerToAvailableOrders_ERC721[user].length
            );
        for (
            uint256 i = 0;
            i < _sellerToAvailableOrders_ERC721[user].length;
            i++
        ) {
            result_ERC721[i] = _exchangeOrders[
                _sellerToAvailableOrders_ERC721[user][i]
            ];
        }

        DataTypes.ExchangeOrder[] memory result_ERC1155 =
            new DataTypes.ExchangeOrder[](
                _sellerToAvailableOrders_ERC1155[user].length
            );
        for (
            uint256 i = 0;
            i < _sellerToAvailableOrders_ERC1155[user].length;
            i++
        ) {
            result_ERC1155[i] = _exchangeOrders[
                _sellerToAvailableOrders_ERC1155[user][i]
            ];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get list of ids of the available exchange orders of a user
     * @return The list of ids of the available exchange orders of a user
     */
    function getAvailableExchangeOrdersIdListByUser(address user)
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        uint256[] memory result_ERC721 =
            new uint256[](_sellerToAvailableOrders_ERC721[user].length);
        for (
            uint256 i = 0;
            i < _sellerToAvailableOrders_ERC721[user].length;
            i++
        ) {
            result_ERC721[i] = _sellerToAvailableOrders_ERC721[user][i];
        }

        uint256[] memory result_ERC1155 =
            new uint256[](_sellerToAvailableOrders_ERC1155[user].length);
        for (
            uint256 i = 0;
            i < _sellerToAvailableOrders_ERC1155[user].length;
            i++
        ) {
            result_ERC1155[i] = _sellerToAvailableOrders_ERC1155[user][i];
        }

        return (result_ERC721, result_ERC1155);
    }

    /**
     * @dev Get exchange orders of a nftAddress
     * @return The exchange orders of a nftAddress
     */
    function getAllExchangeOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory)
    {
        DataTypes.ExchangeOrder[] memory result =
            new DataTypes.ExchangeOrder[](_nftToOrders[nftAddress].length);

        for (uint256 i = 0; i < _nftToOrders[nftAddress].length; i++) {
            result[i] = _exchangeOrders[_nftToOrders[nftAddress][i]];
        }
        return result;
    }

    /**
     * @dev Get list of id of exchange orders of a nftAddress
     * @return The list of id of exchange orders of a nftAddress
     */
    function getAllExchangeOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result =
            new uint256[](_nftToOrders[nftAddress].length);

        for (uint256 i = 0; i < _nftToOrders[nftAddress].length; i++) {
            result[i] = _nftToOrders[nftAddress][i];
        }
        return result;
    }

    /**
     * @dev Get available exchange orders of a nftAddress
     * @return The available exchange orders of a nftAddress
     */
    function getAvailableExchangeOrdersByNftAddress(address nftAddress)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory)
    {
        DataTypes.ExchangeOrder[] memory result =
            new DataTypes.ExchangeOrder[](
                _nftToAvailableOrders[nftAddress].length
            );

        for (uint256 i = 0; i < _nftToAvailableOrders[nftAddress].length; i++) {
            result[i] = _exchangeOrders[_nftToAvailableOrders[nftAddress][i]];
        }

        return result;
    }

    /**
     * @dev Get list of id of available exchange orders of a nftAddress
     * @return The list of id of available exchange orders of a nftAddress
     */
    function getAvailableExchangeOrdersIdListByNftAddress(address nftAddress)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result =
            new uint256[](_nftToAvailableOrders[nftAddress].length);

        for (uint256 i = 0; i < _nftToAvailableOrders[nftAddress].length; i++) {
            result[i] = _nftToAvailableOrders[nftAddress][i];
        }

        return result;
    }

    /**
     * @dev Get exchange orders was purchased by a user
     * @return The exchange orders was purchased by a user
     */
    function getExchangeOrdersBoughtByUser(address user)
        external
        view
        returns (DataTypes.ExchangeOrder[] memory)
    {
        DataTypes.ExchangeOrder[] memory result =
            new DataTypes.ExchangeOrder[](_buyers[user].length);

        for (uint256 i = 0; i < _buyers[user].length; i++) {
            result[i] = _exchangeOrders[_buyers[user][i]];
        }

        return result;
    }

    /**
     * @dev Get list of id of exchange orders was purchased by a user
     * @return The list of id of exchange orders was purchased by a user
     */
    function getExchangeOrdersBoughtIdListByUser(address user)
        external
        view
        returns (uint256[] memory)
    {
        return _buyers[user];
    }

    /**
     * @dev Get latest exchangeId of a nft is of type ERC721
     * @param nftAddress The address of nft
     * @param tokenId The tokenId of nft
     * @return found (true, false) and latest exchangeId
     */
    function getLatestExchangeId_ERC721(address nftAddress, uint256 tokenId)
        external
        view
        returns (bool found, uint256 id)
    {
        uint256 exchangeId = _inforToExchangeId_ERC721[nftAddress][tokenId];
        if (
            _exchangeOrders[exchangeId].nftAddresses[0] == nftAddress &&
            _exchangeOrders[exchangeId].tokenIds[0] == tokenId
        ) {
            return (true, exchangeId);
        } else {
            return (false, exchangeId);
        }
    }

    /**
     * @dev Get latest exchangeId of a nft is of type ERC1155
     * @param seller The address of seller
     * @param nftAddress The address of nft
     * @param tokenId The tokenId of nft
     * @return found (true, false) and latest exchangeId
     */
    function getLatestExchangeId_ERC1155(
        address seller,
        address nftAddress,
        uint256 tokenId
    ) external view returns (bool found, uint256 id) {
        uint256 exchangeId =
            _inforToExchangeId_ERC1155[seller][nftAddress][tokenId];
        if (
            _exchangeOrders[exchangeId].nftAddresses[0] == nftAddress &&
            _exchangeOrders[exchangeId].tokenIds[0] == tokenId &&
            _exchangeOrders[exchangeId].users[0] == seller
        ) {
            return (true, exchangeId);
        } else {
            return (false, exchangeId);
        }
    }

    /**
     * @dev Check exchange order of a nft ERC721 is duplicate or not
     * @param nftAddress The address of nft contract
     * @param tokenId The tokenId of nft
     * @param seller The address of seller
     * @return true or fasle
     */
    function checkDuplicate_ERC721(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool) {
        for (
            uint256 i = 0;
            i < _sellerToAvailableOrders_ERC721[seller].length;
            i++
        ) {
            if (
                _exchangeOrders[_sellerToAvailableOrders_ERC721[seller][i]]
                    .nftAddresses[0] ==
                nftAddress &&
                _exchangeOrders[_sellerToAvailableOrders_ERC721[seller][i]]
                    .tokenIds[0] ==
                tokenId
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Check exchange order of a nft ERC1155 is duplicate or not
     * @param nftAddress The address of nft contract
     * @param tokenId The tokenId of nft
     * @param seller The address of seller
     * @return true or fasle
     */
    function checkDuplicate_ERC1155(
        address nftAddress,
        uint256 tokenId,
        address seller
    ) external view returns (bool) {
        for (
            uint256 i = 0;
            i < _sellerToAvailableOrders_ERC1155[seller].length;
            i++
        ) {
            if (
                _exchangeOrders[_sellerToAvailableOrders_ERC1155[seller][i]]
                    .nftAddresses[0] ==
                nftAddress &&
                _exchangeOrders[_sellerToAvailableOrders_ERC1155[seller][i]]
                    .tokenIds[0] ==
                tokenId
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Add exchange order to
     - _exchangeOrders,
     - _sellerToOrders,
     - _nftToOrders,
     - _availableExchangeOrders_ERC1155 or _availableExchangeOrders_ERC71,
     - _sellerToAvailableOrders_ERC1155 or _sellerToAvailableOrders_ERC721,
     - _nftToAvailableOrders
     * internal function called inside addExchangeOrder() function
     * @param exchangeOrder Exchange order object
     */
    function _addExchangeOrderToList(
        DataTypes.ExchangeOrder memory exchangeOrder
    ) internal {
        uint256 exchangeId = exchangeOrder.exchangeId;
        _sellerToOrders[exchangeOrder.users[0]].push(exchangeId);
        _nftToOrders[exchangeOrder.nftAddresses[0]].push(exchangeId);
        _nftToAvailableOrders[exchangeOrder.nftAddresses[0]].push(exchangeId);

        if (nftList.isERC1155(exchangeOrder.nftAddresses[0]) == true) {
            _availableExchangeOrders_ERC1155.push(exchangeId);
            _sellerToAvailableOrders_ERC1155[exchangeOrder.users[0]].push(
                exchangeId
            );
            _inforToExchangeId_ERC1155[exchangeOrder.users[0]][
                exchangeOrder.nftAddresses[0]
            ][exchangeOrder.tokenIds[0]] = exchangeId;
        } else {
            _availableExchangeOrders_ERC721.push(exchangeId);
            _sellerToAvailableOrders_ERC721[exchangeOrder.users[0]].push(
                exchangeId
            );
            _inforToExchangeId_ERC721[exchangeOrder.nftAddresses[0]][
                exchangeOrder.tokenIds[0]
            ] = exchangeId;
        }
    }

    /**
     * @dev Remove exchange order from
     - _availableExchangeOrders,
     - _availableExchangeOrders_ERC1155 or _availableExchangeOrders_ERC721
     - _sellerToAvailableOrders_ERC1155 or _sellerToAvailableOrders_ERC721,
     - _nftToAvailableOrders
     * internal function called inside completeExchnangeOrder() and deactiveExchangeOrder() function
     * @param exchangeId Id of exchange order
     */
    function _removeExchangeOrderFromList(uint256 exchangeId) internal {
        DataTypes.ExchangeOrder memory exchangeOrder =
            _exchangeOrders[exchangeId];
        _nftToAvailableOrders[exchangeOrder.nftAddresses[0]].removeAtValue(
            exchangeId
        );
        if (nftList.isERC1155(exchangeOrder.nftAddresses[0]) == true) {
            _availableExchangeOrders_ERC1155.removeAtValue(exchangeId);
            _sellerToAvailableOrders_ERC1155[exchangeOrder.users[0]]
                .removeAtValue(exchangeId);
        } else {
            _availableExchangeOrders_ERC721.removeAtValue(exchangeId);
            _sellerToAvailableOrders_ERC721[exchangeOrder.users[0]]
                .removeAtValue(exchangeId);
        }
    }
}
