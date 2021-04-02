/** @format */

const { ethers } = require("hardhat");
const { expect } = require("chai");
const { describe } = require("mocha");

describe("NFTCampaign", async () => {
  let nftCampaign, nft, token;
  let admin, campaignOwner1, campaignOwner2, user1, user2;

  before(async () => {
    [
      admin,
      campaignOwner1,
      campaignOwner2,
      user1,
      user2,
    ] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("TestERC20");
    token = await ERC20.connect(admin).deploy("LEAF", "LEAF");
    await token.deployed();

    const ERC721 = await ethers.getContractFactory("TestERC721");
    nft = await ERC721.connect(admin).deploy("TREE", "TREE");
    await nft.deployed();

    const NFTCampaign = await ethers.getContractFactory(
      "contracts/claim/NFTCampaign.sol:NFTCampaign"
    );
    nftCampaign = await NFTCampaign.connect(admin).deploy();

    await nftCampaign.deployed();
  });

  describe("Check NFTCampaign info", async () => {
    it("owner of NFTCampaign should be admin", async () => {
      let owner = await nftCampaign.owner();
      expect(owner).to.equal(admin.address);
    });
  });

  describe("Register NFT", async () => {
    before(async () => {
      await token
        .connect(admin)
        .mint(campaignOwner1.address, "1234567890123456789");
      await token
        .connect(campaignOwner1)
        .approve(nftCampaign.address, "123456789");
    });

    it("check campaign owner1 balance", async () => {
      let balance = await token.balanceOf(campaignOwner1.address);
      expect(balance).to.equal("1234567890123456789");
    });

    it("Register successfully", async () => {
      await nftCampaign
        .connect(campaignOwner1)
        .registerCampaign(
          nft.address,
          token.address,
          "100",
          "10",
          Date.now(),
          Date.now() + 1241412412,
          "hi there"
        );
      let campaignCount = await nftCampaign.getCampaignCount();
      expect(campaignCount).to.equal(1);
    });

    it("token balance of nft campaign", async () => {
      let balance = await token.balanceOf(nftCampaign.address);
      expect(balance).to.equal(1000);
    });

    it("Force End campaign", async () => {
      await nftCampaign.connect(campaignOwner1).forceEnd(0);
      let balance = await token.balanceOf(nftCampaign.address);
      expect(balance).to.equal(0);
    });
  });
});
