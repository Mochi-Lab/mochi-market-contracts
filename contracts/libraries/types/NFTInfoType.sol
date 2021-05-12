// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library NFTInfoType {
    struct NFTInfo {
        // the id of the nft in array
        uint256 id;
        // nft address
        address nftAddress;
        // is ERC1155
        bool isERC1155;
        // is registered
        bool isRegistered;
        // is accepted by admin
        bool isAccepted;
        // registrant
        address registrant;
    }
}
