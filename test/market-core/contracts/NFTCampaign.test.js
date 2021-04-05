/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { time } = require('@openzeppelin/test-helpers');

describe('Market', async () => {
  let deployer, alice, bob;
  let nftCampaign;
  let seedifyNft;
  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    let NFTCampaign = await ethers.getContractFactory('NFTCampaign');
    nftCampaign = await NFTCampaign.connect(deployer).deploy();

    let SeedifyNFT = await ethers.getContractFactory('SeedifyNFT');
    seedifyNft = await SeedifyNFT.connect(alice).deploy(
      'SeedifyNFT',
      'SNFT',
      'TestUri'
    );
  });
});
