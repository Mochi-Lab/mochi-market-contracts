// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library CollectionType {
    struct Collection {
        // collectionId
        uint256 id;
        // contract address
        address contractAddress;
        // isERC1155
        bool isERC1155;
        // creator address
        address creator;
    }
}
