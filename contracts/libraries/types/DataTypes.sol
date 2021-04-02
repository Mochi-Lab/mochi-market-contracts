// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

library DataTypes {
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
    }

    struct SellOrder {
        //the id of sell order in array
        uint256 sellId;
        // the address of the nft
        address nftAddress;
        // the tokenId
        uint256 tokenId;
        // amount to sell
        uint256 amount;
        // sold amount
        uint256 soldAmount;
        // seller
        address payable seller;
        // unit price
        uint256 price;
        // token
        address token;
        // is active to buy
        bool isActive;
        // time create a sell order
        uint256 sellTime;
        // buyers
        address[] buyers;
        // buy time
        uint256[] buyTimes;
    }

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

    struct ExchangeOrder {
        // exchangeId
        uint256 exchangeId;
        // source and destination nft address
        address[] nftAddresses;
        // source and destination nft tokenId
        uint256[] tokenIds;
        // amount of soucre and destination nft
        uint256[] nftAmounts;
        // tokens
        address[] tokens;
        // prices
        uint256[] prices;
        // users join exchane
        address[] users;
        // exchange times
        uint256[] times;
        // call data;
        bytes[] datas;
        // is active
        bool isActive;
        // sold amount
        uint256 soldAmount;
    }

    struct DynamicArray {
        // index to value
        mapping(uint256 => uint256) value;
        // length of array
        uint256 length;
    }
}
