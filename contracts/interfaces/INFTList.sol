// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

/**
 * @title Interface of NFTList contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface INFTList {
  function isAcceptedNFT(address nftAdress) external view returns (bool);

  function addNFTDirectly(address nftAddress, bool isERC1155) external;

  function isERC1155(address nftAddress) external view returns (bool);
}
