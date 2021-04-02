// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Mochi NFT Contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract Mochi is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    modifier onlyOwnerOf(uint256 _tokenId) {
        require(msg.sender == ownerOf(_tokenId));
        _;
    }

    constructor() public ERC721("Mochi", "MOC") {}

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
