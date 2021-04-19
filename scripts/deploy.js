const { ethers } = require('hardhat');

async function main() {
  let royaltyNumerator = '20';
  let royaltyDenominator = '100';
  let momaToken = '0xffffffffffffffffffffffffffffffffffffffff';
  let momaFeeNumerator = '1';
  let momaFeeDenominator = '100';
  let regularFeeNumerator = '25';
  let regularFeeDenominator = '1000';
  let nativeCoin = 'ETH';

  let [deployer, marketAdmin] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  // Deploy AddressesProvider contract
  console.log('\nDeploying AddressesProvider...');
  let AddressesProvider = await ethers.getContractFactory('AddressesProvider');
  let addressesProvider = await AddressesProvider.connect(deployer).deploy();
  await addressesProvider.deployed();
  // SetAdmin
  console.log('\nSet Market Admin...');
  await addressesProvider.connect(deployer).setAdmin(marketAdmin.address);

  // Deploy NFTList contract
  console.log('\nDeploying NFTList...');
  let NFTList = await ethers.getContractFactory('NFTList');
  let nftListImpl = await NFTList.connect(deployer).deploy();
  await nftListImpl.deployed();
  let initData = nftListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
  ]);
  console.log('\nSet NFTList Implementation...');
  await addressesProvider.connect(deployer).setNFTListImpl(nftListImpl.address, initData);

  // Deploy Vault contract
  console.log('\nDeploying Vault...');
  let Vault = await ethers.getContractFactory('Vault');
  let vaultImpl = await Vault.connect(deployer).deploy();
  await vaultImpl.deployed();
  initData = vaultImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
    royaltyNumerator,
    royaltyDenominator,
    nativeCoin,
  ]);
  console.log('\nSet Vault Implementation...');
  await addressesProvider.connect(deployer).setVaultImpl(vaultImpl.address, initData);

  // Deploy SellOrderList contract
  console.log('\nDeploying SellOrderListContract...');
  let SellOrderList = await ethers.getContractFactory('SellOrderList');
  let sellOrderListImpl = await SellOrderList.connect(deployer).deploy();
  await sellOrderListImpl.deployed();
  initData = sellOrderListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
  ]);
  console.log('\nSet SellOrderListContract Implementation...');
  await addressesProvider
    .connect(deployer)
    .setSellOrderListImpl(sellOrderListImpl.address, initData, {
      gasLimit: 6721975,
    });

  // Deploy ExchangeOrderList contract
  console.log('\nDeploying ExchangeOrderList...');
  let ExchangeOrderList = await ethers.getContractFactory('ExchangeOrderList');
  let exchangeOrderListImpl = await ExchangeOrderList.connect(deployer).deploy();
  await exchangeOrderListImpl.deployed();
  initData = exchangeOrderListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
  ]);
  console.log('\nSet ExchangeOrderList Implementation...');
  await addressesProvider
    .connect(deployer)
    .setExchangeOrderListImpl(exchangeOrderListImpl.address, initData, {
      gasLimit: 6721975,
    });

  // Deploy CreativeStudio contract
  console.log('\nDeploying CreativeStudio...');
  let ERC721Factory = await ethers.getContractFactory('ERC721Factory');
  let erc721Factory = await ERC721Factory.connect(deployer).deploy();
  await erc721Factory.deployed();
  let ERC1155Factory = await ethers.getContractFactory('ERC1155Factory');
  let erc1155Factory = await ERC1155Factory.connect(deployer).deploy();
  await erc1155Factory.deployed();
  let CreativeStudio = await ethers.getContractFactory('CreativeStudio');
  let creativeStudioImpl = await CreativeStudio.connect(deployer).deploy();
  await creativeStudioImpl.deployed();
  initData = creativeStudioImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
    erc721Factory.address,
    erc1155Factory.address,
  ]);
  console.log('\nSet CreativeStudio Implementation...');
  await addressesProvider
    .connect(deployer)
    .setCreativeStudioImpl(creativeStudioImpl.address, initData, {
      gasLimit: 6721975,
    });

  // Deploy Market contract
  console.log('\nDeploying Market...');
  let Market = await ethers.getContractFactory('Market');
  let marketImpl = await Market.connect(deployer).deploy();
  await marketImpl.deployed();
  initData = marketImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
    momaToken,
    momaFeeNumerator,
    momaFeeDenominator,
    regularFeeNumerator,
    regularFeeDenominator,
  ]);
  console.log('\nSet Market Implementation...');
  await addressesProvider.connect(deployer).setMarketImpl(marketImpl.address, initData);

  console.log('\nDeploy Mochi NFT...');
  let MochiNFT = await ethers.getContractFactory('MochiNFT');
  let mochiNFT = await MochiNFT.connect(deployer).deploy();
  await mochiNFT.deployed();

  let nftListAddress = await addressesProvider.getNFTList();
  let vaultAddress = await addressesProvider.getVault();
  let sellOrderListAddress = await addressesProvider.getSellOrderList();
  let exchangeOrderListAddress = await addressesProvider.getExchangeOrderList();
  let creativeStudioAddress = await addressesProvider.getCreativeStudio();
  let marketAddress = await addressesProvider.getMarket();

  let nftList = await ethers.getContractAt('NFTList', nftListAddress);
  console.log('\nRegister Mochi NFT...');
  await nftList.connect(marketAdmin).registerNFT(mochiNFT.address, false);
  console.log('\nAccept Mochi NFT...');
  await nftList.connect(marketAdmin).acceptNFT(mochiNFT.address);
  console.log('\n\n\nResult\n\n');
  console.log('AddressesProvider: ', addressesProvider.address);
  console.log('NFTList: ', nftListAddress);
  console.log('Vault: ', vaultAddress);
  console.log('SellOrderList: ', sellOrderListAddress);
  console.log('ExchangeOrderList: ', exchangeOrderListAddress);
  console.log('CreativeStudio: ', creativeStudioAddress);
  console.log('Market: ', marketAddress);
  console.log('Mochi NFT: ', mochiNFT.address);
  console.log('Admin: ', marketAdmin.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
