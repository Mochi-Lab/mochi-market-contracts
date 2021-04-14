// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library SellOrderListErrors {
    string public constant CALLER_NOT_MARKET = "Caller is not the market";
    string public constant RANGE_IS_INVALID = "Range is invalid"; // 'The range must be valid'
}
