// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title Interface of AddressesProvider contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface MiniIAddressesProvider {
    function getAddress(bytes32 id) external view returns (address);

    function getNFTList() external view returns (address);

    function getMarket() external view returns (address);

    function getSellOrderList() external view returns (address);

    function getExchangeOrderList() external view returns (address);

    function getVault() external view returns (address);

    function getCreativeStudio() external view returns (address);

    function getAdmin() external view returns (address);
}
