const { ethers, network } = require('hardhat');

async function main() {
  if (
    network.name != 'bsctestnet' &&
    network.name != 'bscmainnet' &&
    network.name != 'rinkeby'
  ) {
    throw Error('Invalid network');
  }

  let royaltyNumerator = '20';
  let royaltyDenominator = '100';
  let momaTokenAddress = '';
  let momaFeeNumerator = '1';
  let momaFeeDenominator = '100';
  let regularFeeNumerator = '25';
  let regularFeeDenominator = '1000';
  let nativeCoin;
  let tx;
  let nativeCoinAddress = '0x0000000000000000000000000000000000000000';

  let [deployer, marketAdmin] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  if (network.name === 'rinkeby') {
    momaTokenAddress = '0xFF02166F7ef6F03b18fB7c6e23d30430202Ef9A2';
    nativeCoin = 'ETH';
  }
  if (network.name === 'bscmainnet') {
    momaTokenAddress = '0xb72842d6f5fedf91d22d56202802bb9a79c6322e';
    nativeCoin = 'BNB';
  }
  if (network.name === 'bsctestnet') {
    nativeCoin = 'BNB';
  }

  if (momaTokenAddress === '' || momaTokenAddress === undefined) {
    console.log('\nDeploy MOMA');
    let MOMATestnet = await ethers.getContractFactory('MOMATestnet');
    let momaToken = await MOMATestnet.connect(deployer).deploy();

    await momaToken.deployed();
    momaTokenAddress = momaToken.address;
  }

  // Deploy AddressesProvider contract
  console.log('\nDeploying AddressesProvider...');
  let AddressesProvider = await ethers.getContractFactory('AddressesProvider');
  let addressesProvider = await AddressesProvider.connect(deployer).deploy();
  await addressesProvider.deployed();
  // SetAdmin
  console.log('\nSet Market Admin...');
  tx = await addressesProvider.connect(deployer).setAdmin(marketAdmin.address);
  await tx.wait();

  // Deploy NFTList contract
  console.log('\nDeploying NFTList...');
  let NFTList = await ethers.getContractFactory('NFTList');
  let nftListImpl = await NFTList.connect(deployer).deploy();
  await nftListImpl.deployed();
  let initData = nftListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
  ]);
  console.log('\nSet NFTList Implementation...');
  tx = await addressesProvider.connect(deployer).setNFTListImpl(nftListImpl.address, initData);
  await tx.wait();

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
  tx = await addressesProvider.connect(deployer).setVaultImpl(vaultImpl.address, initData);
  await tx.wait();

  // Deploy SellOrderList contract
  console.log('\nDeploying SellOrderListContract...');
  let SellOrderList = await ethers.getContractFactory('SellOrderList');
  let sellOrderListImpl = await SellOrderList.connect(deployer).deploy();
  await sellOrderListImpl.deployed();
  initData = sellOrderListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
  ]);
  console.log('\nSet SellOrderListContract Implementation...');
  tx = await addressesProvider
    .connect(deployer)
    .setSellOrderListImpl(sellOrderListImpl.address, initData, {
      gasLimit: 6721975,
    });
  await tx.wait();

  // Deploy ExchangeOrderList contract
  console.log('\nDeploying ExchangeOrderList...');
  let ExchangeOrderList = await ethers.getContractFactory('ExchangeOrderList');
  let exchangeOrderListImpl = await ExchangeOrderList.connect(deployer).deploy();
  await exchangeOrderListImpl.deployed();
  initData = exchangeOrderListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
  ]);
  console.log('\nSet ExchangeOrderList Implementation...');
  tx = await addressesProvider
    .connect(deployer)
    .setExchangeOrderListImpl(exchangeOrderListImpl.address, initData, {
      gasLimit: 6721975,
    });
  await tx.wait();

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
  tx = await addressesProvider
    .connect(deployer)
    .setCreativeStudioImpl(creativeStudioImpl.address, initData, {
      gasLimit: 6721975,
    });
  await tx.wait();

  // Deploy Market contract
  console.log('\nDeploying Market...');
  let Market = await ethers.getContractFactory('Market');
  let marketImpl = await Market.connect(deployer).deploy();
  await marketImpl.deployed();
  initData = marketImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
    momaTokenAddress,
    momaFeeNumerator,
    momaFeeDenominator,
    regularFeeNumerator,
    regularFeeDenominator,
  ]);
  console.log('\nSet Market Implementation...');
  tx = await addressesProvider.connect(deployer).setMarketImpl(marketImpl.address, initData);
  await tx.wait();

  // Approve Native coin and MOMA;
  console.log('\nAccept native coin and MOMA');
  let market = await ethers.getContractAt('Market', await addressesProvider.getMarket());
  tx = await market.connect(marketAdmin).acceptToken(nativeCoinAddress);
  await tx.wait();
  tx = await market.connect(marketAdmin).acceptToken(momaTokenAddress);

  console.log('\nDeploy Mochi NFT...');
  let MochiERC721NFT = await ethers.getContractFactory('MochiERC721NFT');
  let mochiERC721NFT = await MochiERC721NFT.connect(deployer).deploy();
  await mochiERC721NFT.deployed();

  let MochiERC1155NFT = await ethers.getContractFactory('MochiERC1155NFT');
  let mochiERC1155NFT = await MochiERC1155NFT.connect(deployer).deploy();
  await mochiERC1155NFT.deployed();

  let nftListAddress = await addressesProvider.getNFTList();
  let vaultAddress = await addressesProvider.getVault();
  let sellOrderListAddress = await addressesProvider.getSellOrderList();
  let exchangeOrderListAddress = await addressesProvider.getExchangeOrderList();
  let creativeStudioAddress = await addressesProvider.getCreativeStudio();
  let marketAddress = await addressesProvider.getMarket();

  let nftList = await ethers.getContractAt('NFTList', nftListAddress);
  console.log('\nRegister Mochi NFT...');
  tx = await nftList.connect(marketAdmin).registerNFT(mochiERC721NFT.address, false);
  await tx.wait();
  tx = await nftList.connect(marketAdmin).registerNFT(mochiERC1155NFT.address, true);
  await tx.wait();
  console.log('\nAccept Mochi NFT...');
  tx = await nftList.connect(marketAdmin).acceptNFT(mochiERC721NFT.address);
  await tx.wait();
  tx = await nftList.connect(marketAdmin).acceptNFT(mochiERC1155NFT.address);
  await tx.wait();
  console.log('\n\n\nResult\n\n');
  console.log('AddressesProvider: ', addressesProvider.address);
  console.log('NFTList: ', nftListAddress);
  console.log('Vault: ', vaultAddress);
  console.log('SellOrderList: ', sellOrderListAddress);
  console.log('ExchangeOrderList: ', exchangeOrderListAddress);
  console.log('CreativeStudio: ', creativeStudioAddress);
  console.log('Market: ', marketAddress);
  console.log('Mochi ERC721 NFT: ', mochiERC721NFT.address);
  console.log('Mochi ERC1155 NFT: ', mochiERC1155NFT.address);
  console.log('MOMA Token: ', momaTokenAddress);
  console.log('Market Admin: ', marketAdmin.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
