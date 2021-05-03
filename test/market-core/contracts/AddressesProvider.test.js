/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const {
  deployAddressesProvider,
  deployNFTListWithInitData,
  deployVaultWithInitData,
  deploySellOrderListWithInitData,
  deployMarketWithInitData,
  deployTestERC20,
} = require('../helpers');

const { ERRORS, IDS, MOMA_FEE } = require('../constans');

describe.only('AddressesProvider', async () => {
  let addressesProvider, nftListImpl, sellOrderListImpl, vaultImpl, marketImpl;
  let moma;
  let initData, data;
  let deployer, marketAdmin, user, someAddress;

  beforeEach(async () => {
    [deployer, marketAdmin, user, someAddress] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    moma = await deployTestERC20(deployer, 'MOchi MArket Token', 'MOMA');
  });

  it('AddressesProvider owner must be deployer', async () => {
    expect(await addressesProvider.owner()).to.equal(deployer.address);
  });

  it('Only owner can call setAdmin', async () => {
    await expect(addressesProvider.connect(user).setAdmin(user.address)).to.be.revertedWith(
      ERRORS.CALLER_NOT_OWNER
    );
  });

  it('Only onwer can call setNFTListImpl', async () => {
    data = await deployNFTListWithInitData(deployer, addressesProvider.address);

    nftListImpl = data.nftListImpl;
    initData = data.initData;

    await expect(
      addressesProvider.connect(user).setNFTListImpl(nftListImpl.address, initData)
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);
  });

  it('Only onwer can call setVaultImpl', async () => {
    data = await deployVaultWithInitData(deployer, addressesProvider.address);

    vaultImpl = data.vaultImpl;
    initData = data.initData;

    await expect(
      addressesProvider.connect(user).setVaultImpl(vaultImpl.address, initData)
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);
  });

  it('Only onwer can call setSellOrderListImpl', async () => {
    data = await deploySellOrderListWithInitData(deployer, addressesProvider.address);

    sellOrderListImpl = data.sellOrderListImpl;
    initData = data.initData;

    await expect(
      addressesProvider.connect(user).setSellOrderListImpl(sellOrderListImpl.address, initData)
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);
  });

  it('Only onwer can call setMarketImpl', async () => {
    data = await deployMarketWithInitData(deployer, addressesProvider.address, moma.address);

    marketImpl = data.marketImpl;
    initData = data.initData;

    await expect(
      addressesProvider.connect(user).setMarketImpl(marketImpl.address, initData)
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);
  });

  it('Only owner can call setAddressAsProxy', async () => {
    await expect(
      addressesProvider.connect(user).setAddressAsProxy(IDS.NFT_LIST, someAddress.address, '0x')
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);

    await expect(
      addressesProvider.connect(user).setAddressAsProxy(IDS.VAULT, someAddress.address, '0x')
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);

    await expect(
      addressesProvider
        .connect(user)
        .setAddressAsProxy(IDS.SELL_ORDER_LIST, someAddress.address, '0x')
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);

    await expect(
      addressesProvider.connect(user).setAddressAsProxy(IDS.MARKET, someAddress.address, '0x')
    ).to.be.revertedWith(ERRORS.CALLER_NOT_OWNER);
  });

  context('Caller is AddressesProvider owner', () => {
    it('ADMIN must be set successfully', async () => {
      await addressesProvider.connect(deployer).setAdmin(marketAdmin.address);
      expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);
    });

    it('NFTListImpl must be set successfully', async () => {
      data = await deployNFTListWithInitData(deployer, addressesProvider.address);

      nftListImpl = data.nftListImpl;
      initData = data.initData;

      await addressesProvider.connect(deployer).setNFTListImpl(nftListImpl.address, initData);

      let nftListProxyAddress = await addressesProvider.getNFTList();
      let nftListProxy = await ethers.getContractAt('NFTList', nftListProxyAddress);
      expect(await nftListProxy.addressesProvider()).to.equal(addressesProvider.address);
    });

    it('Call setNFTListImpl at second time must be successfully', async () => {
      data = await deployNFTListWithInitData(deployer, addressesProvider.address);

      nftListImpl = data.nftListImpl;
      initData = data.initData;

      await addressesProvider.connect(deployer).setNFTListImpl(nftListImpl.address, initData);
      await addressesProvider.connect(deployer).setNFTListImpl(nftListImpl.address, '0x');

      let nftListProxyAddress = await addressesProvider.getNFTList();
      let nftListProxy = await ethers.getContractAt('NFTList', nftListProxyAddress);
      expect(await nftListProxy.addressesProvider()).to.equal(addressesProvider.address);
    });

    it('VaultImpl must be set successfully', async () => {
      data = await deployVaultWithInitData(deployer, addressesProvider.address);

      vaultImpl = data.vaultImpl;
      initData = data.initData;

      await addressesProvider.connect(deployer).setVaultImpl(vaultImpl.address, initData);

      let vaultProxyAddress = await addressesProvider.getVault();
      let vaultProxy = await ethers.getContractAt('Vault', vaultProxyAddress);
      expect(await vaultProxy.addressesProvider()).to.equal(addressesProvider.address);
    });

    it('Call setVaultImpl at second time must be successfully', async () => {
      data = await deployVaultWithInitData(deployer, addressesProvider.address);

      vaultImpl = data.vaultImpl;
      initData = data.initData;

      await addressesProvider.connect(deployer).setVaultImpl(vaultImpl.address, initData);

      await addressesProvider.connect(deployer).setVaultImpl(vaultImpl.address, '0x');

      let vaultProxyAddress = await addressesProvider.getVault();
      let vaultProxy = await ethers.getContractAt('Vault', vaultProxyAddress);
      expect(await vaultProxy.addressesProvider()).to.equal(addressesProvider.address);
    });

    it('SellOrderListImpl must be set successfully', async () => {
      data = await deploySellOrderListWithInitData(deployer, addressesProvider.address);

      sellOrderListImpl = data.sellOrderListImpl;
      initData = data.initData;

      await addressesProvider
        .connect(deployer)
        .setSellOrderListImpl(sellOrderListImpl.address, initData);

      let sellOrderListProxyAddress = await addressesProvider.getSellOrderList();
      let sellOrderListProxy = await ethers.getContractAt(
        'SellOrderList',
        sellOrderListProxyAddress
      );
      expect(await sellOrderListProxy.addressesProvider()).to.equal(addressesProvider.address);
    });

    it('Call setSellOrderListImpl at second time must be successfully', async () => {
      data = await deploySellOrderListWithInitData(deployer, addressesProvider.address);

      sellOrderListImpl = data.sellOrderListImpl;
      initData = data.initData;

      await addressesProvider
        .connect(deployer)
        .setSellOrderListImpl(sellOrderListImpl.address, initData);

      await addressesProvider
        .connect(deployer)
        .setSellOrderListImpl(sellOrderListImpl.address, '0x');

      let sellOrderListProxyAddress = await addressesProvider.getSellOrderList();
      let sellOrderListProxy = await ethers.getContractAt(
        'SellOrderList',
        sellOrderListProxyAddress
      );
      expect(await sellOrderListProxy.addressesProvider()).to.equal(addressesProvider.address);
    });

    it.only('MarketImpl must be set successfully', async () => {
      data = await deployMarketWithInitData(deployer, addressesProvider.address, moma.address);

      marketImpl = data.marketImpl;
      initData = data.initData;

      await addressesProvider
        .connect(deployer)
        .setMarketImpl(marketImpl.address, initData, moma.address);

      let marketProxyAddress = await addressesProvider.getMarket();
      let marketProxy = await ethers.getContractAt('Market', marketProxyAddress);
      expect(await marketProxy.addressesProvider()).to.equal(addressesProvider.address);
    });

    it('Call setMarketImpl at second time must be successfully', async () => {
      data = await deployMarketWithInitData(deployer, addressesProvider.address);

      marketImpl = data.marketImpl;
      initData = data.initData;

      await addressesProvider.connect(deployer).setMarketImpl(marketImpl.address, initData);

      await addressesProvider.connect(deployer).setMarketImpl(marketImpl.address, '0x');

      let marketProxyAddress = await addressesProvider.getMarket();
      let marketProxy = await ethers.getContractAt('Market', marketProxyAddress);
      expect(await marketProxy.addressesProvider()).to.equal(addressesProvider.address);
    });
  });
});
