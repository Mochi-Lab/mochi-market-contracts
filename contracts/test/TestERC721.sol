// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestERC721 is ERC721, Ownable {
    constructor(string memory name_, string memory symbol_) public ERC721(name_, symbol_) {}

    function mint(address _to, uint256 _tokenId) public onlyOwner {
        _safeMint(_to, _tokenId);
    }
}
