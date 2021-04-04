// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TheTotemOfCreation is ERC721, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        string memory baseUri
    ) public ERC721(name, symbol) {
        _setBaseURI(baseUri);
    }

    function mint(
        address to,
        uint256 tokenId,
        string memory tokenUri,
        bytes memory data
    ) external onlyOwner {
        _safeMint(to, tokenId, data);
        if (bytes(tokenUri).length != 0) {
            _setTokenURI(tokenId, tokenUri);
        }
    }

    function mintByBatch(
        address[] memory to,
        uint256[] memory tokenId,
        string[] memory tokenUri,
        bytes[] memory data
    ) external onlyOwner {
        require(
            to.length == tokenId.length &&
                tokenId.length == tokenUri.length &&
                tokenUri.length == data.length,
            "Parameters are not match"
        );
        for (uint256 i = 0; i < to.length; i++) {
            _safeMint(to[i], tokenId[i], data[i]);
            if (bytes(tokenUri[i]).length != 0) {
                _setTokenURI(tokenId[i], tokenUri[i]);
            }
        }
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Caller is not token owner");
        _burn(tokenId);
    }

    function setBaseURI(string memory baseUri) external onlyOwner {
        _setBaseURI(baseUri);
    }

    function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
        _setTokenURI(tokenId, uri);
    }
}
