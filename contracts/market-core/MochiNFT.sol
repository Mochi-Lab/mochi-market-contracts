// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Mochi NFT Contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract MochiNFT is ERC721 {
    using Counters for Counters.Counter;
    string private _baseUri;
    mapping(uint256 => string) private _tokenUris;

    Counters.Counter private _tokenIds;

    modifier onlyOwnerOf(uint256 _tokenId) {
        require(_msgSender() == ownerOf(_tokenId));
        _;
    }

    constructor() ERC721("Mochi Market NFT", "MOMANFT") {}

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

    function mint(address to, string memory tokenUri) external {
        _tokenIds.increment();

        uint256 newNftTokenId = _tokenIds.current();

        _mint(to, newNftTokenId);
        _setTokenURI(newNftTokenId, tokenUri);
    }

    function burn(uint256 tokenId) external onlyOwnerOf(tokenId) {
        _burn(tokenId);
    }

    function setTokenURI(uint256 tokenId, string memory tokenUri) external onlyOwnerOf(tokenId) {
        _setTokenURI(tokenId, tokenUri);
    }
}
