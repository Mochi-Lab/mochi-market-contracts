// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Mochi ERC721 NFT Contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract MochiERC721NFT is ERC721 {
    using Counters for Counters.Counter;
    mapping(uint256 => string) private _tokenUri;

    Counters.Counter private _tokenIds;

    modifier onlyOwnerOf(uint256 _tokenId) {
        require(_msgSender() == ownerOf(_tokenId));
        _;
    }

    constructor() ERC721("Mochi Market NFT", "MOMANFT") {}

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _tokenUri[tokenId];
    }

    function mint(string memory tokenUri) external {
        _tokenIds.increment();

        uint256 newTokenId = _tokenIds.current();

        _mint(_msgSender(), newTokenId);
        _tokenUri[newTokenId] = tokenUri;
    }

    function burn(uint256 tokenId) external onlyOwnerOf(tokenId) {
        _burn(tokenId);
    }
}
