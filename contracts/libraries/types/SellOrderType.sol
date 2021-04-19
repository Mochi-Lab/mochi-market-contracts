// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library SellOrderType {
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
}
