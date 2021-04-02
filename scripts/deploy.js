const hre = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  const AddressesProvider = await hre.ethers.getContractFactory('AddressesProvider');
  const addressesProvider = await AddressesProvider.deploy();
  await addressesProvider.setAdmin(deployer.address);
  console.log('Address AddressesProvider', addressesProvider.address);

  // deploy an implementation of NFTList contract
  let NFTList = await hre.ethers.getContractFactory('NFTList');
  let nftListImpl = await NFTList.deploy();
  console.log('Address NftListImpl', nftListImpl.address);
  // get initData of NFTList contract
  let initData = nftListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address
  ]);

  // call function setNFTListImpl() of AddressesProvider contract
  await addressesProvider.setNFTListImpl(nftListImpl.address, initData, { gasLimit: 30000000 });

  //******************** */

  // deploy an implementation of Vault contract
  let Vault = await hre.ethers.getContractFactory('Vault');
  let vaultImpl = await Vault.deploy();
  console.log('Address Vault', vaultImpl.address);
  // get initData of Vault contract
  initData = vaultImpl.interface.encodeFunctionData('initialize', [addressesProvider.address]);
  // call function setVaultImpl() of AddressesProvider contract
  await addressesProvider.setVaultImpl(vaultImpl.address, initData, { gasLimit: 30000000 });

  //******************** */

  // deploy an implementation of SellOrderList contract
  let SellOrderList = await hre.ethers.getContractFactory('SellOrderList');
  let sellOrderListImpl = await SellOrderList.deploy();
  console.log('Address SellOrderList', sellOrderListImpl.address);
  // get initData of SellOrderList contract
  initData = sellOrderListImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address
  ]);
  // call function setSellOrderListImpl() of AddressesProvider contract
  await addressesProvider.setSellOrderListImpl(sellOrderListImpl.address, initData, {
    gasLimit: 30000000
  });

  //******************** */

  let Market = await hre.ethers.getContractFactory('Market');
  let marketImpl = await Market.deploy();
  console.log('Address Market', marketImpl.address);

  // get initData of Market contract
  initData = marketImpl.interface.encodeFunctionData('initialize', [
    addressesProvider.address,
    2,
    1000
  ]);

  // call function setMarketImpl() of AddressesProvider contract
  await addressesProvider.setMarketImpl(marketImpl.address, initData, {
    gasLimit: 30000000
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
