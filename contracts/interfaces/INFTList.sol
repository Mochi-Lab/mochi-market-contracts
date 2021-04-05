// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../libraries/types/DataTypes.sol";

/**
 * @title Interface of NFTList contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface INFTList {
    function registerNFT(address nftAddress, bool isERC1155) external;

    function acceptNFT(address nftAddress) external;

    function revokeNFT(address nftAddress) external;

    function isERC1155(address nftAddress) external view returns (bool);

    function addNFTDirectly(address nftAddress, bool isERC1155) external;

    function getNFTInfor(address nftAddress) external view returns (DataTypes.NFTInfo memory);

    function getNFTCount() external view returns (uint256);

    function getAcceptedNFTs() external view returns (address[] memory);

    function isAcceptedNFT(address nftAddress) external view returns (bool);
}
