// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title AddressesProvider contract
 * @dev Main registry of addresses part of or connected to the NFT Market, including permissioned roles
 * - Acting also as factory of proxies and admin of those, so with right to change its implementations
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract AddressesProvider is Ownable {
    mapping(bytes32 => address) private _addresses;

    bytes32 public constant NFT_LIST = "NFT_LIST";
    bytes32 public constant MARKET = "MARKET";
    bytes32 public constant SELL_ORDER_LIST = "SELL_ORDER_LIST";
    bytes32 public constant EXCHANGE_ORDER_LIST = "EXCHANGE_ORDER_LIST";
    bytes32 public constant VAULT = "VAULT";
    bytes32 public constant ADMIN = "ADMIN";
    bytes32 public constant CREATIVE_STUDIO = "CREATIVE_STUDIO";

    event ProxyCreated(bytes32 id, address indexed newAddress);
    event AdminUpdated(address indexed newAddress);
    event NFTListUpdated(address indexed newAddress);
    event MarketUpdated(address indexed newAddress);
    event SellOrderListUpdated(address indexed newAddress);
    event VaultUpdated(address indexed newAddress);
    event CreativeStudioUpdated(address indexed newAddress);
    event ExchangeOrderListUpdated(address indexed newAddress);
    event AddressSet(bytes32 id, address indexed newAddress, bool hasProxy);

    /**
     * @dev The functions below are getters/setters of addresses that are outside the context
     * of the protocol hence the upgradable proxy pattern is not used
     **/

    /**
     * @dev Gets market admin
     * @return the address of market admin
     **/
    function getAdmin() external view returns (address) {
        return getAddress(ADMIN);
    }

    /**
     * @dev Set market admin
     * Grant admin role for an address
     */
    function setAdmin(address admin) external onlyOwner {
        _addresses[ADMIN] = admin;
        emit AdminUpdated(admin);
    }

    /**
     * @dev Update the implementation of the NFTList, or creates the proxy and
     * setting the new `nftList` implementation on the first time calling it
     * @param nftList The new NFTList implementation
     * @param params The calldata for initialize in the new implementation (if required)
     **/
    function setNFTListImpl(address nftList, bytes memory params) external onlyOwner {
        _updateImpl(NFT_LIST, nftList, params);
        emit NFTListUpdated(nftList);
    }

    /**
     * @dev Return the address of the NFTList proxy
     * @return The NFTList proxy address
     **/
    function getNFTList() external view returns (address) {
        return getAddress(NFT_LIST);
    }

    /**
     * @dev Update the implementation of the Market, or creates the proxy and
     * setting the new `Market` implementation on the first time calling it
     * @param market The new Market implementation
     * @param params The calldata for initialize in the new implementation (if required)
     **/
    function setMarketImpl(address market, bytes memory params) external onlyOwner {
        _updateImpl(MARKET, market, params);
        emit MarketUpdated(market);
    }

    /**
     * @dev Return the address of the Market proxy
     * @return The Market proxy address
     **/
    function getMarket() external view returns (address) {
        return getAddress(MARKET);
    }

    /**
     * @dev Update the implementation of the SellOrderList, or creates the proxy and
     * setting the new `SellOrderList` implementation on the first time calling it
     * @param sellOrderList The new SellOrderList implementation
     * @param params The calldata for initialize in the new implementation (if required)
     **/
    function setSellOrderListImpl(address sellOrderList, bytes memory params) external onlyOwner {
        _updateImpl(SELL_ORDER_LIST, sellOrderList, params);
        emit SellOrderListUpdated(sellOrderList);
    }

    /**
     * @dev Return the address of the SellOrderList proxy
     * @return The SellOrderList proxy address
     **/
    function getSellOrderList() external view returns (address) {
        return getAddress(SELL_ORDER_LIST);
    }

    /**
     * @dev Update the implementation of the Vault, or creates the proxy and
     * setting the new `Vault` implementation on the first time calling it
     * @param vault The new Vault implementation
     * @param params The calldata for initialize in the new implementation (if required)
     **/
    function setVaultImpl(address vault, bytes memory params) external onlyOwner {
        _updateImpl(VAULT, vault, params);
        emit VaultUpdated(vault);
    }

    /**
     * @dev Return the address of the Vault proxy
     * @return The Vault proxy address
     **/
    function getVault() external view returns (address) {
        return getAddress(VAULT);
    }

    /**
     * @dev Update the implementation of the CreativeStudio, or creates the proxy and
     * setting the new `CreativeStudio` implementation on the first time calling it
     * @param creativeStudio The new CreativeStudio implementation
     * @param params The calldata for initialize in the new implementation (if required)
     **/
    function setCreativeStudioImpl(address creativeStudio, bytes memory params) external onlyOwner {
        _updateImpl(CREATIVE_STUDIO, creativeStudio, params);
        emit CreativeStudioUpdated(creativeStudio);
    }

    /**
     * @dev Return the address of the CreativeStudio proxy
     * @return The CreativeStudio proxy address
     **/
    function getCreativeStudio() external view returns (address) {
        return getAddress(CREATIVE_STUDIO);
    }

    /**
     * @dev Update the implementation of the ExchangeOrderList, or creates the proxy and
     * setting the new `ExchangeOrderList` implementation on the first time calling it
     * @param exchangeOrderList The new ExchangeOrderList implementation
     * @param params The calldata for initialize in the new implementation (if required)
     **/
    function setExchangeOrderListImpl(address exchangeOrderList, bytes memory params)
        external
        onlyOwner
    {
        _updateImpl(EXCHANGE_ORDER_LIST, exchangeOrderList, params);
        emit ExchangeOrderListUpdated(exchangeOrderList);
    }

    /**
     * @dev Return the address of the ExchangeOrderList proxy
     * @return The ExchangeOrderList proxy address
     **/
    function getExchangeOrderList() external view returns (address) {
        return getAddress(EXCHANGE_ORDER_LIST);
    }

    /**
     * @dev General function to update the implementation of a proxy registered with
     * certain `id`. If there is no proxy registered, it will instantiate one and
     * set as implementation the `implementationAddress`
     * IMPORTANT Use this function carefully, only for ids that don't have an explicit
     * setter function, in order to avoid unexpected consequences
     * @param id The id
     * @param implementationAddress The address of the new implementation
     * @param params The calldata for initialize in the new implementation (if required)
     */
    function setAddressAsProxy(
        bytes32 id,
        address implementationAddress,
        bytes memory params
    ) external onlyOwner {
        _updateImpl(id, implementationAddress, params);
        emit AddressSet(id, implementationAddress, true);
    }

    /**
     * @dev Set an address for an id replacing the address saved in the addresses map
     * IMPORTANT Use this function carefully, as it will do a hard replacement
     * @param id The id
     * @param newAddress The address to set
     */
    function setAddress(bytes32 id, address newAddress) external onlyOwner {
        _addresses[id] = newAddress;
        emit AddressSet(id, newAddress, false);
    }

    /**
     * @dev Return an address by id
     * @return The address
     */
    function getAddress(bytes32 id) public view returns (address) {
        return _addresses[id];
    }

    /**
     * @dev Internal function to update the implementation of a specific proxied component of the protocol
     * - If there is no proxy registered in the given `id`, it creates the proxy setting `newAdress`
     *   as implementation and calls the initialize() function on the proxy
     * - If there is already a proxy registered, it just updates the implementation to `newAddress` and
     *   calls the initialize() function via upgradeToAndCall() in the proxy
     * @param id The id of the proxy to be updated
     * @param newAddress The address of the new implementation
     * @param params The calldata for initialize in the new implementation (if required)
     **/
    function _updateImpl(
        bytes32 id,
        address newAddress,
        bytes memory params
    ) internal {
        address payable proxyAddress = payable(_addresses[id]);

        if (proxyAddress == address(0)) {
            TransparentUpgradeableProxy proxy =
                new TransparentUpgradeableProxy(newAddress, address(this), params);
            _addresses[id] = address(proxy);
            emit ProxyCreated(id, address(proxy));
        } else {
            if (params.length == 0) {
                TransparentUpgradeableProxy(proxyAddress).upgradeTo(newAddress);
            } else {
                TransparentUpgradeableProxy(proxyAddress).upgradeToAndCall(newAddress, params);
            }
        }
    }
}
