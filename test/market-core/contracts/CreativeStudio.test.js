/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { deployAddressesProvider, allSetup, deployTestERC20 } = require('../helpers');
const { ERRORS, FEE } = require('../constans');

describe('CreativeStudio', async () => {
  let addressesProvider, nftListProxy, creativeStudioProxy;
  let moma;
  let deployer, marketAdmin, alice, bob;

  beforeEach(async () => {
    [deployer, marketAdmin, alice, bob] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    moma = await deployTestERC20(deployer, 'MOchi MArket Token', 'MOMA');
    let result = await allSetup(deployer, addressesProvider, deployer, marketAdmin, moma.address);
    addressesProvider = result.addressesProvider;
    nftListProxy = result.nftListProxy;
    creativeStudioProxy = result.creativeStudioProxy;
  });

  it('All setup successfully', async () => {
    expect(await nftListProxy.addressesProvider()).to.equal(addressesProvider.address);
    expect(await creativeStudioProxy.addressesProvider()).to.equal(addressesProvider.address);
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);
  });

  it('Create collection successfully', async () => {
    await creativeStudioProxy
      .connect(alice)
      .createERC721Collection('Alice Collection', 'AC', 'Alice Uri');

    let aliceCollections = await creativeStudioProxy.getCollectionsByUser(alice.address);

    expect(await nftListProxy.isAcceptedNFT(aliceCollections[0].contractAddress)).to.be.equal(true);
  });
});
