// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./SampleERC721.sol";

/**
 * @title ERC721Factory contract
 * @author MochiLab
 **/
contract ERC721Factory {
    constructor() {}

    /**
     * @dev Deploy a new ERC721 contract
     */
    function newERC721Collection(
        address owner,
        string memory name,
        string memory symbol
    ) external returns (address) {
        address collectionAddress = address(new SampleERC721(owner, name, symbol));

        return collectionAddress;
    }
}
