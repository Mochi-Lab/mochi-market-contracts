// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title Interface of ERC721Factory contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface IERC721Factory {
    function newERC721Collection(
        address owner,
        string memory name,
        string memory symbol,
        string memory baseUri
    ) external returns (address);
}
