/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const {
  deployAddressesProvider,
  allSetup,
  deployTestERC721,
  deployTestERC1155,
} = require('../helpers');
const { ERRORS } = require('../constans');

describe('NFTList Contract', async () => {
  let addressesProvider, nftList;
  let deployer, marketAdmin, alice;
  let nftERC721, nftERC1155;
  let moma;

  beforeEach(async () => {
    [deployer, marketAdmin, alice] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    moma = await deployTestERC20(deployer, 'MOchi MArket Token', 'MOMA');

    let modules = await allSetup(deployer, addressesProvider, deployer, marketAdmin, moma.address);
    addressesProvider = modules.addressesProvider;
    nftList = modules.nftListProxy;

    nftERC721 = await deployTestERC721(alice, 'TestERC721', 'TestERC721');
    nftERC1155 = await deployTestERC1155(alice, 'TestERC1155');
  });

  it('All deploy successfully', async () => {
    expect(await nftList.addressesProvider()).to.equal(addressesProvider.address);
    expect(await addressesProvider.getNFTList()).to.equal(nftList.address);
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);
  });

  it('Alice registers NFT fail because submits not correct type', async () => {
    await expectRevert.unspecified(nftList.connect(alice).registerNFT(nftERC721.address, true));
    await expectRevert.unspecified(nftList.connect(alice).registerNFT(nftERC1155.address, false));
  });

  describe('Alice registers NFT and Admin accepts it', async () => {
    beforeEach(async () => {
      await nftList.connect(alice).registerNFT(nftERC721.address, false);
      await nftList.connect(alice).registerNFT(nftERC1155.address, true);
    });

    it('Alice registers NFT successfully', async () => {
      let nftERC721Info = await nftList.getNFTInfo(nftERC721.address);
      let nftERC1155Info = await nftList.getNFTInfo(nftERC1155.address);

      expect(nftERC721Info.isRegistered).to.equal(true);
      expect(nftERC721Info.isAccepted).to.equal(false);
      expect(nftERC721Info.isERC1155).to.equal(false);

      expect(nftERC1155Info.isRegistered).to.be.equal(true);
      expect(nftERC1155Info.isAccepted).to.be.equal(false);
      expect(nftERC1155Info.isERC1155).to.equal(true);

      expect(await nftList.getNFTCount()).to.equal('2');
      expect(await nftList.getAllNFTAddress()).to.be.include(nftERC721.address);
      expect(await nftList.getAllNFTAddress()).to.be.include(nftERC1155.address);
    });

    it('Alice registers NFT fail with a registered address', async () => {
      await expectRevert(
        nftList.connect(alice).registerNFT(nftERC721.address, false),
        ERRORS.NFT_ALREADY_REGISTERED
      );

      await expectRevert(
        nftList.connect(alice).registerNFT(nftERC1155.address, false),
        ERRORS.NFT_ALREADY_REGISTERED
      );
    });

    it('Only Admin can accept NFT', async () => {
      await expectRevert(
        nftList.connect(alice).acceptNFT(nftERC721.address),
        ERRORS.CALLER_NOT_MARKET_ADMIN
      );

      await expectRevert(
        nftList.connect(alice).acceptNFT(nftERC1155.address),
        ERRORS.CALLER_NOT_MARKET_ADMIN
      );
    });

    it('Admin accepts fail with an unregistered NFT', async () => {
      let anotherNFTERC721 = await deployTestERC721(alice, 'TestERC721_2', 'TestERC721_2');
      await expectRevert(
        nftList.connect(marketAdmin).acceptNFT(anotherNFTERC721.address),
        ERRORS.NFT_NOT_REGISTERED
      );
    });

    it('Admin accepts successfully', async () => {
      await nftList.connect(marketAdmin).acceptNFT(nftERC721.address);
      await nftList.connect(marketAdmin).acceptNFT(nftERC1155.address);

      let nftERC721Info = await nftList.getNFTInfo(nftERC721.address);
      let nftERC1155Info = await nftList.getNFTInfo(nftERC1155.address);

      expect(nftERC721Info.isAccepted).to.equal(true);
      expect(nftERC1155Info.isAccepted).to.equal(true);
      expect(await nftList.getAcceptedNFTs()).to.include(nftERC721.address);
      expect(await nftList.getAcceptedNFTs()).to.include(nftERC1155.address);
    });

    it('Admin accepts fail with an accepted NFT', async () => {
      await nftList.connect(marketAdmin).acceptNFT(nftERC721.address);
      await nftList.connect(marketAdmin).acceptNFT(nftERC1155.address);

      await expectRevert(
        nftList.connect(marketAdmin).acceptNFT(nftERC721.address),
        ERRORS.NFT_ALREADY_ACCEPTED
      );
      await expectRevert(
        nftList.connect(marketAdmin).acceptNFT(nftERC1155.address),
        ERRORS.NFT_ALREADY_ACCEPTED
      );
    });
  });
});
