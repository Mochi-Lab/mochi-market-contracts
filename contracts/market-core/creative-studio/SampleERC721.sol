// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor(address owner_) {
        _owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

// ERC721 has an auto-incremental tokenId that cannot be burned
contract SampleERC721 is ERC721, Ownable {
    using Counters for Counters.Counter;
    string private _baseUri;
    mapping(uint256 => string) private _tokenUris;

    Counters.Counter private _tokenIds;

    constructor(
        address owner,
        string memory name,
        string memory symbol,
        string memory baseUri
    ) ERC721(name, symbol) Ownable(owner) {
        _setBaseURI(baseUri);
    }

    function _setBaseURI(string memory baseUri) internal {
        _baseUri = baseUri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseUri;
    }

    function baseURI() external view returns (string memory) {
        return _baseURI();
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721Metadata: URI set of nonexistent token");
        _tokenUris[tokenId] = _tokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _tokenUris[tokenId];
    }

    function mint(
        address to,
        string memory tokenUri,
        bytes memory data
    ) external onlyOwner returns (uint256) {
        _tokenIds.increment();

        uint256 newNftTokenId = _tokenIds.current();

        _safeMint(to, newNftTokenId, data);

        _setTokenURI(newNftTokenId, tokenUri);

        return newNftTokenId;
    }

    function setBaseURI(string memory baseUri) external onlyOwner {
        _setBaseURI(baseUri);
    }

    function setTokenURI(uint256 tokenId, string memory tokenUri) external onlyOwner {
        _setTokenURI(tokenId, tokenUri);
    }

    function currentTokenId() public view returns (uint256) {
        return _tokenIds.current();
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Caller is not token owner");
        _burn(tokenId);
    }
}
