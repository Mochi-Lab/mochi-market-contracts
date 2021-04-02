/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Wrapped ERC1155', async () => {
  let deployer, alice, bob;
  let testERC1155, testWERC1155;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    let TestERC1155 = await ethers.getContractFactory('TestERC1155');
    testERC1155 = await TestERC1155.connect(deployer).deploy('TestURI');

    let TestWERC1155 = await ethers.getContractFactory('WrappedERC1155');

    testWERC1155 = await TestWERC1155.connect(deployer).deploy(testERC1155.address, '0');
  });

  it('Create pair successfully', async () => {
    console.log('Wrapped erc1155 name: ', await testWERC1155.name());
    console.log('Wrapped erc1155 symbol: ', await testWERC1155.symbol());

    await testERC1155.connect(deployer).mint(alice.address, '0', '1000', '0x');

    await testERC1155.connect(alice).setApprovalForAll(testWERC1155.address, true);

    await testWERC1155.connect(alice).deposit(alice.address, '100', '0x');

    console.log('Alice WERC1155 balance: ', parseInt(await testWERC1155.balanceOf(alice.address)));
  });
});
