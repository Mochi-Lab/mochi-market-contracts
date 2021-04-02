/** @format */

const { ethers } = require('hardhat');
const { FEE } = require('./constans');

exports.deployAddressesProvider = async deployer => {
  let AddressesProvider = await ethers.getContractFactory('AddressesProvider');
  let addressesProvider = await AddressesProvider.connect(deployer).deploy();
  return addressesProvider;
};

exports.deployNFTListImpl = async deployer => {
  let NFTList = await ethers.getContractFactory('NFTList');
  let nftListImpl = await NFTList.connect(deployer).deploy();
  return nftListImpl;
};

exports.deployNFTListWithInitData = async (deployer, provider) => {
  let nftListImpl = await this.deployNFTListImpl(deployer);
  let initData = nftListImpl.interface.encodeFunctionData('initialize', [provider]);

  return { nftListImpl, initData };
};

exports.deployNFTListProxyAndSetAddress = async (
  deployer,
  addressesProvider,
  addressesProviderOwner
) => {
  let { nftListImpl, initData } = await this.deployNFTListWithInitData(
    deployer,
    addressesProvider.address
  );

  await addressesProvider
    .connect(addressesProviderOwner)
    .setNFTListImpl(nftListImpl.address, initData);

  let nftListProxy = await ethers.getContractAt('NFTList', await addressesProvider.getNFTList());

  return { nftListProxy, addressesProvider };
};

exports.deployVaultImpl = async deployer => {
  let Vault = await ethers.getContractFactory('Vault');
  let vaultImpl = await Vault.connect(deployer).deploy();
  return vaultImpl;
};

exports.deployVaultWithInitData = async (deployer, provider) => {
  let vaultImpl = await this.deployVaultImpl(deployer);
  let initData = vaultImpl.interface.encodeFunctionData('initialize', [
    provider,
    '20',
    '100',
    'ETH'
  ]);

  return { vaultImpl, initData };
};

exports.deployVaultProxyAndSetAddress = async (
  deployer,
  addressesProvider,
  addressesProviderOwner
) => {
  let { vaultImpl, initData } = await this.deployVaultWithInitData(
    deployer,
    addressesProvider.address
  );

  await addressesProvider.connect(addressesProviderOwner).setVaultImpl(vaultImpl.address, initData);

  let vaultProxy = await ethers.getContractAt('Vault', await addressesProvider.getVault());

  return { vaultProxy, addressesProvider };
};

exports.deploySellOrderListImpl = async deployer => {
  let SellOrderList = await ethers.getContractFactory('SellOrderList');
  let sellOrderListImpl = await SellOrderList.connect(deployer).deploy();
  return sellOrderListImpl;
};

exports.deploySellOrderListWithInitData = async (deployer, provider) => {
  let sellOrderListImpl = await this.deploySellOrderListImpl(deployer);
  let initData = sellOrderListImpl.interface.encodeFunctionData('initialize', [provider]);

  return { sellOrderListImpl, initData };
};

exports.deploySellOrderListProxyAndSetAddress = async (
  deployer,
  addressesProvider,
  addressesProviderOwner
) => {
  let { sellOrderListImpl, initData } = await this.deploySellOrderListWithInitData(
    deployer,
    addressesProvider.address
  );

  await addressesProvider
    .connect(addressesProviderOwner)
    .setSellOrderListImpl(sellOrderListImpl.address, initData);

  let sellOrderListProxy = await ethers.getContractAt(
    'SellOrderList',
    await addressesProvider.getSellOrderList()
  );

  return { sellOrderListProxy, addressesProvider };
};

exports.deployMarketImpl = async deployer => {
  let Market = await ethers.getContractFactory('Market');
  let marketImpl = await Market.connect(deployer).deploy();
  return marketImpl;
};

exports.deployMarketWithInitData = async (deployer, provider) => {
  let marketImpl = await this.deployMarketImpl(deployer);
  let initData = marketImpl.interface.encodeFunctionData('initialize', [
    provider,
    FEE.NUMERATOR,
    FEE.DENOMINATOR
  ]);

  return { marketImpl, initData };
};

exports.deployMarketProxyAndSetAddress = async (
  deployer,
  addressesProvider,
  addressesProviderOwner
) => {
  let { marketImpl, initData } = await this.deployMarketWithInitData(
    deployer,
    addressesProvider.address
  );

  await addressesProvider
    .connect(addressesProviderOwner)
    .setMarketImpl(marketImpl.address, initData);

  let marketProxy = await ethers.getContractAt('Market', await addressesProvider.getMarket());

  return { marketProxy, addressesProvider };
};

exports.deployERC721FactoryImpl = async deployer => {
  let ERC721Factory = await ethers.getContractFactory('ERC721Factory');
  let erc721FactoryImpl = await ERC721Factory.connect(deployer).deploy();
  return erc721FactoryImpl;
};

exports.deployERC1155FactoryImpl = async deployer => {
  let ERC1155Factory = await ethers.getContractFactory('ERC1155Factory');
  let erc1155FactoryImpl = await ERC1155Factory.connect(deployer).deploy();
  return erc1155FactoryImpl;
};

exports.deployCreativeStudioImpl = async deployer => {
  let CreativeStudio = await ethers.getContractFactory('CreativeStudio');
  let creativeStudioImpl = await CreativeStudio.connect(deployer).deploy();
  return creativeStudioImpl;
};

exports.deployCreativeStudioWithInitData = async (deployer, provider) => {
  let creativeStudioImpl = await this.deployCreativeStudioImpl(deployer);

  let erc721FactoryImpl = await this.deployERC721FactoryImpl(deployer, provider);
  let erc1155FactoryImpl = await this.deployERC1155FactoryImpl(deployer, provider);
  let initData = creativeStudioImpl.interface.encodeFunctionData('initialize', [
    provider,
    erc721FactoryImpl.address,
    erc1155FactoryImpl.address
  ]);

  return { creativeStudioImpl, initData };
};

exports.deployCreativeStudioProxyAndSetAddress = async (
  deployer,
  addressesProvider,
  addressesProviderOwner
) => {
  let { creativeStudioImpl, initData } = await this.deployCreativeStudioWithInitData(
    deployer,
    addressesProvider.address
  );

  await addressesProvider
    .connect(addressesProviderOwner)
    .setCreativeStudioImpl(creativeStudioImpl.address, initData);

  let creativeStudioProxy = await ethers.getContractAt(
    'CreativeStudio',
    await addressesProvider.getCreativeStudio()
  );

  return { creativeStudioProxy, addressesProvider };
};

exports.deployExchangeOrderListImpl = async deployer => {
  let ExchangeOrderList = await ethers.getContractFactory('ExchangeOrderList');
  let exchangeOrderListImpl = await ExchangeOrderList.connect(deployer).deploy();
  return exchangeOrderListImpl;
};

exports.deployExchangeOrderListWithInitData = async (deployer, provider) => {
  let exchangeOrderListImpl = await this.deployExchangeOrderListImpl(deployer);
  let initData = exchangeOrderListImpl.interface.encodeFunctionData('initialize', [provider]);

  return { exchangeOrderListImpl, initData };
};

exports.deployExchangeOrderListProxyAndSetAddress = async (
  deployer,
  addressesProvider,
  addressesProviderOwner
) => {
  let { exchangeOrderListImpl, initData } = await this.deployExchangeOrderListWithInitData(
    deployer,
    addressesProvider.address
  );

  await addressesProvider
    .connect(addressesProviderOwner)
    .setExchangeOrderListImpl(exchangeOrderListImpl.address, initData);

  let exchangeOrderListProxy = await ethers.getContractAt(
    'ExchangeOrderList',
    await addressesProvider.getExchangeOrderList()
  );

  return { exchangeOrderListProxy, addressesProvider };
};

exports.allSetup = async (deployer, addressesProvider, addressesProviderOwner, marketAdmin) => {
  let data;
  let nftListProxy,
    vaultProxy,
    sellOrderListProxy,
    marketProxy,
    creativeStudioProxy,
    exchangeOrderListProxy;

  // for nft list
  data = await this.deployNFTListProxyAndSetAddress(
    deployer,
    addressesProvider,
    addressesProviderOwner
  );
  addressesProvider = data.addressesProvider;
  nftListProxy = data.nftListProxy;

  // for vault
  data = await this.deployVaultProxyAndSetAddress(
    deployer,
    addressesProvider,
    addressesProviderOwner
  );
  addressesProvider = data.addressesProvider;
  vaultProxy = data.vaultProxy;

  // for sell order list
  data = await this.deploySellOrderListProxyAndSetAddress(
    deployer,
    addressesProvider,
    addressesProviderOwner
  );
  addressesProvider = data.addressesProvider;
  sellOrderListProxy = data.sellOrderListProxy;

  // for market
  data = await this.deployMarketProxyAndSetAddress(
    deployer,
    addressesProvider,
    addressesProviderOwner
  );

  addressesProvider = data.addressesProvider;
  marketProxy = data.marketProxy;

  // for create studio
  data = await this.deployCreativeStudioProxyAndSetAddress(
    deployer,
    addressesProvider,
    addressesProviderOwner
  );

  addressesProvider = data.addressesProvider;
  creativeStudioProxy = data.creativeStudioProxy;

  // for sell order list
  data = await this.deployExchangeOrderListProxyAndSetAddress(
    deployer,
    addressesProvider,
    addressesProviderOwner
  );
  addressesProvider = data.addressesProvider;
  exchangeOrderListProxy = data.exchangeOrderListProxy;

  await addressesProvider.connect(addressesProviderOwner).setAdmin(marketAdmin.address);

  return {
    nftListProxy,
    vaultProxy,
    sellOrderListProxy,
    marketProxy,
    addressesProvider,
    creativeStudioProxy,
    exchangeOrderListProxy
  };
};

exports.deployTestERC721 = async (deployer, name, symbol) => {
  let TestERC721 = await ethers.getContractFactory('TestERC721');
  let testERC721 = await TestERC721.connect(deployer).deploy(name, symbol);
  return testERC721;
};
