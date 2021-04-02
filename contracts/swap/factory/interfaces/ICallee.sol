// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

interface ICallee {
    function mochiswapCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
