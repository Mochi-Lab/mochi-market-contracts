// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TheTotemOfCreation is ERC721, Ownable {
    string private _baseUri;
    mapping(uint256 => string) private _tokenUris;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseUri
    ) ERC721(name, symbol) {
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
