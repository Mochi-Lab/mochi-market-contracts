// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./SampleERC1155.sol";

/**
 * @title ERC1155Factory contract
 * @author MochiLab
 **/
contract ERC1155Factory {
    constructor() public {}

    /**
     * @dev Deploy a new ERC1155 contract
     */
    function newERC1155Collection(address owner, string memory uri) external returns (address) {
        address collectionAddress = address(new SampleERC1155(owner, uri));

        return collectionAddress;
    }
}
