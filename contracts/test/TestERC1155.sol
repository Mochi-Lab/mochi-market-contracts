// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestERC1155 is ERC1155, Ownable {
    constructor(string memory uri_) ERC1155(uri_) {}

    function mint(
        address account_,
        uint256 tokenId_,
        uint256 amount_,
        bytes memory data_
    ) external onlyOwner {
        _mint(account_, tokenId_, amount_, data_);
    }
}
