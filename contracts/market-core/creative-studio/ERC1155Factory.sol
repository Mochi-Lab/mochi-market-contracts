// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./SampleERC1155.sol";

/**
 * @title ERC1155Factory contract
 * @author MochiLab
 **/
contract ERC1155Factory {
    constructor() {}

    /**
     * @dev Deploy a new ERC1155 contract
     */
    function newERC1155Collection(
        address owner,
        string memory name,
        string memory symbol
    ) external returns (address) {
        address collectionAddress = address(new SampleERC1155(owner, name, symbol));

        return collectionAddress;
    }
}
