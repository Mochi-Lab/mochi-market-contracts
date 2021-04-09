const { ethers, upgrades } = require('hardhat');

async function main() {
  const NFT_LIST = ethers.utils.formatBytes32String('NFT_LIST');
  const VAULT = ethers.utils.formatBytes32String('VAULT');
  const SELL_ORDER_LIST = ethers.utils.formatBytes32String('SELL_ORDER_LIST');
  const EXCHANGE_ORDER_LIST = ethers.utils.formatBytes32String('EXCHANGE_ORDER_LIST');
  const MARKET = ethers.utils.formatBytes32String('MARKET');
  const ADMIN = ethers.utils.formatBytes32String('ADMIN');
  const CREATIVE_STUDIO = ethers.utils.formatBytes32String('CREATIVE_STUDIO');

  const royaltyNumerator = '20';
  const royaltyDenominator = '100';
  const feeNumerator = '25';
  const feeDenominator = '1000';
  const nativeCoin = 'BNB';

  const [deployer, marketAdmin] = await ethers.getSigners();

  /**
   * AddressProvider
   */
  console.log('Deploying AddressesProvider...');
  const AddressesProvider = await ethers.getContractFactory('AddressesProvider');
  const addressesProvider = await AddressesProvider.deploy();
  await addressesProvider.deployed();
  // SetAdmin
  console.log('Set Market Admin...');
  await addressesProvider.setAdmin(marketAdmin.address);

  /**
   * NFTList
   */
  console.log('Deploying NFTList...');
  const NFTList = await hre.ethers.getContractFactory('NFTList');
  const nftList = await upgrades.deployProxy(NFTList, [addressesProvider.address]);
  console.log('Deploy Mochi NFT...');
  const Mochi = await ethers.getContractFactory('Mochi');
  const mochi = await Mochi.deploy();
  await mochi.deployed();

  console.log('Register Mochi NFT...');
  await nftList.connect(marketAdmin).registerNFT(mochi.address, false);
  console.log('Accept Mochi NFT...');
  await nftList.connect(marketAdmin).acceptNFT(mochi.address);

  /**
   * Vault
   */
  console.log('Deploying Vault...');
  const Vault = await hre.ethers.getContractFactory('Vault');
  const vault = await upgrades.deployProxy(Vault, [
    addressesProvider.address,
    royaltyNumerator,
    royaltyDenominator,
    nativeCoin,
  ]);

  /**
   * SellOrderList
   */
  console.log('Deploying SellOrderListContract...');
  const SellOrderList = await hre.ethers.getContractFactory('SellOrderList');
  const sellOrderList = await upgrades.deployProxy(SellOrderList, [addressesProvider.address]);

  /**
   * ExchangeOrderList
   */
  console.log('Deploying ExchangeOrderList...');
  const ExchangeOrderList = await hre.ethers.getContractFactory('ExchangeOrderList');
  const exchangeOrderList = await upgrades.deployProxy(ExchangeOrderList, [
    addressesProvider.address,
  ]);

  /**
   * Creative Studio
   */
  console.log('Deploying CreativeStudio...');
  const ERC721Factory = await ethers.getContractFactory('ERC721Factory');
  const erc721Factory = await ERC721Factory.deploy();
  await erc721Factory.deployed();

  const ERC1155Factory = await ethers.getContractFactory('ERC1155Factory');
  const erc1155Factory = await ERC1155Factory.deploy();
  await erc1155Factory.deployed();

  const CreativeStudio = await ethers.getContractFactory('CreativeStudio');
  const creativeStudio = await upgrades.deployProxy(CreativeStudio, [
    addressesProvider.address,
    erc721Factory.address,
    erc1155Factory.address,
  ]);

  /**
   * Market
   */
  console.log('Deploying Market...');
  const Market = await hre.ethers.getContractFactory('Market');
  const market = await upgrades.deployProxy(Market, [
    addressesProvider.address,
    feeNumerator,
    feeDenominator,
  ]);

  console.log('Deploy Done! Store Addresses..');
  await addressesProvider.setAddress(ADMIN, marketAdmin.address);
  await addressesProvider.setAddress(NFT_LIST, nftList.address);
  await addressesProvider.setAddress(VAULT, vault.address);
  await addressesProvider.setAddress(SELL_ORDER_LIST, sellOrderList.address);
  await addressesProvider.setAddress(EXCHANGE_ORDER_LIST, exchangeOrderList.address);
  await addressesProvider.setAddress(MARKET, market.address);
  await addressesProvider.setAddress(CREATIVE_STUDIO, creativeStudio.address);

  console.log('Result');
  console.log('================Non-upgradeable================');
  console.log('Deployer - AdminProxy:', deployer.address);
  console.log('Market Admin: ', marketAdmin.address);
  console.log('AddressesProvider: ', addressesProvider.address);
  console.log('Mochi NFT: ', mochi.address);
  console.log('===============Upgradeable proxies==============');
  console.log('NFTList: ', nftList.address);
  console.log('Vault: ', vault.address);
  console.log('SellOrderList: ', sellOrderList.address);
  console.log('ExchangeOrderList: ', exchangeOrderList.address);
  console.log('CreativeStudio: ', creativeStudio.address);
  console.log('Market: ', market.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
