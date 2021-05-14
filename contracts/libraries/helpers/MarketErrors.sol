// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library MarketErrors {
    string public constant CALLER_NOT_MARKET_ADMIN = "Caller is not the market admin"; // 'The caller must be the market admin'
    string public constant DEMONINATOR_NOT_GREATER_THAN_NUMERATOR =
        "Demoninator not greater than numerator"; // 'The fee denominator must be greater than fee numerator'
    string public constant TOKEN_ALREADY_ACCEPTED = "Token already accepted"; // 'Token already accepted'
    string public constant TOKEN_ALREADY_REVOKED = "Token already revoked"; // 'Token must be accepted'
    string public constant NFT_NOT_ACCEPTED = "NFT is not accepted"; // 'The nft address muse be accepted'
    string public constant TOKEN_NOT_ACCEPTED = "Token is not accepted"; // 'Token is not accepted'
    string public constant AMOUNT_IS_ZERO = "Amount is zero"; // 'Amount must be accepted'
    string public constant INSUFFICIENT_BALANCE = "Insufficient balance"; // 'The fund must be equal or greater than amount to withdraw'
    string public constant NFT_NOT_APPROVED_FOR_MARKET = "NFT is not approved for Market"; // 'The nft must be approved for Market'
    string public constant SELL_ORDER_DUPLICATE = "Sell order is duplicate"; // 'The sell order must be unique'
    string public constant AMOUNT_IS_NOT_EQUAL_ONE = "Amount is not equal 1"; // 'Amount must equal 1'
    string public constant CALLER_NOT_NFT_OWNER = "Caller is not nft owner"; // 'The caller must be the owner of nft'
    string public constant PRICE_IS_ZERO = "Price is zero"; // 'The new price must be greater than zero'
    string public constant CALLER_NOT_SELLER = "Caller is not seller"; // 'The caller must be the seller'
    string public constant SELL_ORDER_NOT_ACTIVE = "Sell order is not active"; // 'The sell order must be active'
    string public constant CALLER_IS_SELLER = "Caller is seller"; // 'The caller must be not the seller'
    string public constant AMOUNT_IS_NOT_ENOUGH = "Amount is not enough"; // 'Amount is not enough'
    string public constant VALUE_NOT_EQUAL_PRICE = "Msg.value is not equal price"; // 'The msg.value must equal price'
    string public constant PRICE_NOT_CHANGE = "Price is not change"; // 'The new price must be not equal price'
    string public constant PARAMETERS_NOT_MATCH = "The parameters are not match"; // 'The parameters must be match'
    string public constant INVALID_CALLDATA = "Invalid call data"; // 'Invalid call data'
    string public constant EXCHANGE_ORDER_DUPLICATE = "Exchange order is duplicate"; // 'The exchange order must be unique'
    string public constant INVALID_DESTINATION = "Invalid destination"; // 'Invalid destination id'
    string public constant EXCHANGE_ORDER_NOT_ACTIVE = "Exchange order is not active";
}
