// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../libraries/types/NFTInfoType.sol";

/**
 * @title Interface of NFTList contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface MiniINFTList {
    function isERC1155(address nftAddress) external view returns (bool);

    function getNFTInfor(address nftAddress) external view returns (NFTInfoType.NFTInfo memory);

    function getNFTCount() external view returns (uint256);

    function getAcceptedNFTs() external view returns (address[] memory);

    function isAcceptedNFT(address nftAddress) external view returns (bool);
}
