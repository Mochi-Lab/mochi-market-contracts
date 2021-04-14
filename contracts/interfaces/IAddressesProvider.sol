// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title Interface of AddressesProvider contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
interface IAddressesProvider {
    function setAddress(
        bytes32 id,
        address newAddress,
        bytes memory params
    ) external;

    function setAddressAsProxy(bytes32 id, address impl) external;

    function getAddress(bytes32 id) external view returns (address);

    function setAddress(bytes32 id, address newAddress) external;

    function getNFTList() external view returns (address);

    function setNFTListImpl(address ercList, bytes memory params) external;

    function getMarket() external view returns (address);

    function setMarketImpl(address market, bytes memory params) external;

    function getSellOrderList() external view returns (address);

    function setSellOrderListImpl(address sellOrderList, bytes memory params) external;

    function getExchangeOrderList() external view returns (address);

    function setExchangeOrderListImpl(address exchangeOrderList, bytes memory params) external;

    function getVault() external view returns (address);

    function setVaultImpl(address vault, bytes memory params) external;

    function getCreativeStudio() external view returns (address);

    function setCreativeStudioImpl(address creativeStudio, bytes memory params) external;

    function getAdmin() external view returns (address);

    function setAdmin(address admin) external;
}
