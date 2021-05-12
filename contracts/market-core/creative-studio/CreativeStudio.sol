// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../../interfaces/IAddressesProvider.sol";
import "../../interfaces/INFTList.sol";
import "../../interfaces/IERC721Factory.sol";
import "../../interfaces/IERC1155Factory.sol";
import "../../libraries/types/CollectionType.sol";

/**
 * @title CreativeStudio contract
 * @author MochiLab
 **/
contract CreativeStudio is Initializable, ReentrancyGuard {
    IAddressesProvider public addressesProvider;
    INFTList public nftList;
    IERC721Factory public erc721Factory;
    IERC1155Factory public erc1155Factory;

    CollectionType.Collection[] internal _allCollections;

    mapping(address => uint256[]) internal _userToCollections;

    event Initialized(address indexed provider);

    event CollectionCreated(address user, address collection, bool isERC1155);

    constructor() {}

    /**
     * @dev Function is invoked by the proxy contract when the CreativeStudio contract is added to the
     * AddressesProvider of the creative studio.
     * - Caching the address of the AddressesProvider in order to reduce gas consumption
     *   on subsequent operations
     * @param provider The address of AddressesProvider
     **/
    function initialize(
        address provider,
        address erc721FactoryAddress,
        address erc1155FactoryAddress
    ) external initializer {
        addressesProvider = IAddressesProvider(provider);
        nftList = INFTList(addressesProvider.getNFTList());
        erc721Factory = IERC721Factory(erc721FactoryAddress);
        erc1155Factory = IERC1155Factory(erc1155FactoryAddress);
        emit Initialized(provider);
    }

    /**
     * @dev Create a new ERC721 collection
     */
    function createERC721Collection(string memory name, string memory symbol)
        external
        nonReentrant
    {
        address collectionAddress = erc721Factory.newERC721Collection(msg.sender, name, symbol);

        CollectionType.Collection memory newCollection =
            CollectionType.Collection({
                id: _allCollections.length,
                contractAddress: collectionAddress,
                isERC1155: false,
                creator: msg.sender
            });

        _allCollections.push(newCollection);

        _userToCollections[msg.sender].push(newCollection.id);

        nftList.addNFTDirectly(
            newCollection.contractAddress,
            false,
            abi.encodeWithSelector(Ownable(collectionAddress).owner.selector)
        );

        emit CollectionCreated(msg.sender, newCollection.contractAddress, false);
    }

    /**
     * @dev Create a new ERC1155 collection
     */
    function createERC1155Collection(string memory name, string memory symbol)
        external
        nonReentrant
    {
        address collectionAddress = erc1155Factory.newERC1155Collection(msg.sender, name, symbol);

        CollectionType.Collection memory newCollection =
            CollectionType.Collection({
                id: _allCollections.length,
                contractAddress: collectionAddress,
                isERC1155: true,
                creator: msg.sender
            });

        _allCollections.push(newCollection);
        _userToCollections[msg.sender].push(newCollection.id);

        nftList.addNFTDirectly(
            newCollection.contractAddress,
            true,
            abi.encodeWithSelector(Ownable(collectionAddress).owner.selector)
        );

        emit CollectionCreated(msg.sender, newCollection.contractAddress, true);
    }

    /**
     * @dev Get collections of a user
     */
    function getCollectionsByUser(address user)
        external
        view
        returns (CollectionType.Collection[] memory)
    {
        CollectionType.Collection[] memory result =
            new CollectionType.Collection[](_userToCollections[user].length);

        for (uint256 i = 0; i < _userToCollections[user].length; i++) {
            result[i] = _allCollections[_userToCollections[user][i]];
        }
        return result;
    }

    /**
     * @dev Get all collections
     */
    function getAllCollections() external view returns (CollectionType.Collection[] memory) {
        return _allCollections;
    }

    /**
     * @dev Get collection by id
     */
    function getCollectionById(uint256 id)
        external
        view
        returns (CollectionType.Collection memory)
    {
        return _allCollections[id];
    }

    /**
     * @dev Get the number of collection
     */
    function getNumberOfCollection() external view returns (uint256) {
        return _allCollections.length;
    }
}
