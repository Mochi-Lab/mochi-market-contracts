// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library ExchangeOrderType {
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
        bytes[] data;
        // is active
        bool isActive;
        // sold amount
        uint256 soldAmount;
    }
}
