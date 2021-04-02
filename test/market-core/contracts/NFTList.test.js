/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { deployAddressesProvider, allSetup, deployTestERC721 } = require('../helpers');
const { ERRORS } = require('../constans');

describe('NFTList', async () => {
  let addressesProvider, nftListProxy;
  let deployer, marketAdmin, user;

  beforeEach(async () => {
    [deployer, marketAdmin, user] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    let result = await allSetup(deployer, addressesProvider, deployer, marketAdmin);
    addressesProvider = result.addressesProvider;
    nftListProxy = result.nftListProxy;
  });

  it('All setup successfully', async () => {
    expect(await nftListProxy.addressesProvider()).to.equal(addressesProvider.address);
    expect(await addressesProvider.getNFTList()).to.equal(nftListProxy.address);
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);
  });

  context('User register NFT first time with valid address', async () => {
    let testERC721;
    beforeEach(async () => {
      testERC721 = await deployTestERC721(user, 'TestERC721', 'TestERC721');
      await nftListProxy.connect(user).registerNFT(testERC721.address, false);
    });

    it('User register NFT first time successfully', async () => {
      let data = await nftListProxy.getNFTInfor(testERC721.address);

      expect(data.isRegistered).to.equal(true);
      expect(data.isAccepted).to.equal(false);
      expect(await nftListProxy.getNFTCount()).to.equal('1');
    });

    it('User register NFT second time fail with registered address', async () => {
      await expect(
        nftListProxy.connect(user).registerNFT(testERC721.address, false)
      ).to.be.revertedWith(ERRORS.NFT_ALREADY_REGISTERED);
    });

    it('Only admin can accept nft', async () => {
      await expect(nftListProxy.connect(user).acceptNFT(testERC721.address)).to.be.revertedWith(
        ERRORS.CALLER_NOT_MARKET_ADMIN
      );
    });

    it('Accept fail with a unregistered nft', async () => {
      let testERC721_2 = await deployTestERC721(user, 'TestERC721_2', 'TestERC721_2');
      await expect(
        nftListProxy.connect(marketAdmin).acceptNFT(testERC721_2.address)
      ).to.be.revertedWith(ERRORS.NFT_NOT_REGISTERED);
    });

    it('Accept successfully', async () => {
      await nftListProxy.connect(marketAdmin).acceptNFT(testERC721.address);
      let data = await nftListProxy.getNFTInfor(testERC721.address);
      expect(data.isAccepted).to.equal(true);
      expect(await nftListProxy.getAcceptedNFTs()).to.include(testERC721.address);
    });

    it('Accept fail with accepted nft', async () => {
      await nftListProxy.connect(marketAdmin).acceptNFT(testERC721.address);
      await expect(
        nftListProxy.connect(marketAdmin).acceptNFT(testERC721.address)
      ).to.be.revertedWith(ERRORS.NFT_ALREADY_ACCEPTED);
    });
  });
});
