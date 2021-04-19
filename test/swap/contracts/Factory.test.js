// /** @format */

// const { ethers } = require('hardhat');
// const { expect } = require('chai');

// describe('Factory', async () => {
//   let deployer, alice, bob;
//   let factory, tokenA, tokenB;

//   beforeEach(async () => {
//     [deployer, alice, bob] = await ethers.getSigners();

//     let Factory = await ethers.getContractFactory('Factory');
//     factory = await Factory.connect(deployer).deploy(deployer.address);

//     let TestERC20 = await ethers.getContractFactory('TestERC20');

//     tokenA = await TestERC20.connect(deployer).deploy('ERC20-A', 'ERC20-A');
//     tokenB = await TestERC20.connect(deployer).deploy('ERC20-B', 'ERC20-B');
//   });

//   it('Create pair successfully', async () => {
//     let pair;

//     await factory.connect(deployer).createPair(tokenA.address, tokenB.address);

//     console.log('Factory address: ', factory.address);

//     console.log('Token 0 address: ', tokenA.address);

//     console.log('Token 1 address: ', tokenB.address);

//     console.log(
//       'Pair address: ',
//       await factory.getPair(tokenA.address, tokenB.address)
//     );

//     pair = await ethers.getContractAt(
//       'MochiswapPair',
//       await factory.getPair(tokenA.address, tokenB.address)
//     );

//     expect(await pair.factory()).to.be.equal(factory.address);

//     console.log('Token pair: ', await pair.token0(), ' ', await pair.token1());

//     console.log('Reserves: ', await pair.getReserves());
//   });
// });
