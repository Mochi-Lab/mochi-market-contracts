// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title Interface of ERC1155Factory contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface IERC1155Factory {
    function newERC1155Collection(
        address owner,
        string memory name,
        string memory symbol
    ) external returns (address);
}
