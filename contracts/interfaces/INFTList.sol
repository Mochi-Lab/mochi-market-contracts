// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../libraries/types/NFTInfoType.sol";

/**
 * @title Interface of NFTList contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface INFTList {
    function registerNFT(address nftAddress, bool isErc1155) external;

    function acceptNFT(address nftAddress) external;

    function revokeNFT(address nftAddress) external;

    function isERC1155(address nftAddress) external view returns (bool);

    function addNFTDirectly(
        address nftAddress,
        bool isErc1155,
        address registrant
    ) external;

    function getNFTInfo(address nftAddress) external view returns (NFTInfoType.NFTInfo memory);

    function getNFTCount() external view returns (uint256);

    function getAcceptedNFTs() external view returns (address[] memory);

    function isAcceptedNFT(address nftAddress) external view returns (bool);
}
