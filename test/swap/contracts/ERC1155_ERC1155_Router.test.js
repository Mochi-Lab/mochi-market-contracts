// /** @format */

// const { ethers } = require('hardhat');
// const { expect } = require('chai');

// describe('ERC1155_ERC1155 Router', async () => {
//   let deployer, alice, bob;
//   let factory, rootRouter, erc1155erc1155Router;
//   let weth, erc1155_A, erc1155_B, wrappedERC1155_A, wrappedERC1155_B, pair;
//   let tokenId = '0';

//   let aliceInitNftBalance_A = 1000;
//   let aliceInitNftBalance_B = 1000;

//   let nftInitSupply_A = 5;
//   let nftInitSupply_B = 5;

//   let deadline = '1701547000';

//   beforeEach(async () => {
//     [deployer, alice, bob] = await ethers.getSigners();

//     let Factory = await ethers.getContractFactory('Factory');
//     factory = await Factory.connect(deployer).deploy(deployer.address);

//     let WETH = await ethers.getContractFactory('WETH9');
//     weth = await WETH.connect(deployer).deploy();

//     let RootRouter = await ethers.getContractFactory('RootRouter');
//     rootRouter = await RootRouter.connect(deployer).deploy(
//       factory.address,
//       weth.address
//     );

//     let ERC1155_ERC1155_Router = await ethers.getContractFactory(
//       'ERC1155_ERC1155_Router'
//     );
//     erc1155erc1155Router = await ERC1155_ERC1155_Router.connect(
//       deployer
//     ).deploy(rootRouter.address);

//     let TestERC1155 = await ethers.getContractFactory('TestERC1155');
//     erc1155_A = await TestERC1155.connect(deployer).deploy('TestUriA');
//     erc1155_B = await TestERC1155.connect(deployer).deploy('TestUriB');

//     await factory
//       .connect(deployer)
//       .createWrappedTokenForERC1155(erc1155_A.address, tokenId);
//     await factory
//       .connect(deployer)
//       .createWrappedTokenForERC1155(erc1155_B.address, tokenId);

//     wrappedERC1155_A = await ethers.getContractAt(
//       'WrappedERC1155',
//       await factory.getWrappedERC1155(erc1155_A.address, tokenId)
//     );

//     wrappedERC1155_B = await ethers.getContractAt(
//       'WrappedERC1155',
//       await factory.getWrappedERC1155(erc1155_B.address, tokenId)
//     );

//     await erc1155_A
//       .connect(deployer)
//       .mint(alice.address, tokenId, aliceInitNftBalance_A, '0x');

//     await erc1155_A
//       .connect(alice)
//       .setApprovalForAll(erc1155erc1155Router.address, true);

//     await erc1155_B
//       .connect(deployer)
//       .mint(alice.address, tokenId, aliceInitNftBalance_B, '0x');

//     await erc1155_B
//       .connect(alice)
//       .setApprovalForAll(erc1155erc1155Router.address, true);

//     await factory
//       .connect(deployer)
//       .createPair(wrappedERC1155_A.address, wrappedERC1155_B.address);

//     console.log('ERC1155_A address: ', erc1155_A.address);
//     console.log('ERC1155_B address: ', erc1155_B.address);
//     console.log('Wrapped token for ERC1155_A: ', wrappedERC1155_A.address);
//     console.log('Wrapped token for ERC1155_B: ', wrappedERC1155_B.address);
//     console.log(
//       'Get pair in Factory: ',
//       await factory.getPair(wrappedERC1155_A.address, wrappedERC1155_B.address)
//     );
//     console.log(
//       'Get pair for by calculation in Root Router: ',
//       await rootRouter.getPairFor(
//         wrappedERC1155_A.address,
//         wrappedERC1155_B.address
//       )
//     );
//     pair = await ethers.getContractAt(
//       'MochiswapPair',
//       await factory.getPair(wrappedERC1155_A.address, wrappedERC1155_B.address)
//     );
//   });

//   it('All setup successfully', async () => {
//     expect(
//       await factory.getPair(wrappedERC1155_A.address, wrappedERC1155_B.address)
//     ).to.be.equal(
//       await rootRouter.getPairFor(
//         wrappedERC1155_A.address,
//         wrappedERC1155_B.address
//       )
//     );
//   });

//   context('Alice addLiquidity_NFT_NFT successfully', async () => {
//     beforeEach(async () => {
//       await erc1155_A
//         .connect(alice)
//         .setApprovalForAll(erc1155erc1155Router.address, true);
//       await erc1155_B
//         .connect(alice)
//         .setApprovalForAll(erc1155erc1155Router.address, true);
//       await erc1155erc1155Router
//         .connect(alice)
//         .addLiquidity_NFT_NFT(
//           [erc1155_A.address, erc1155_B.address],
//           [tokenId, tokenId],
//           [nftInitSupply_A, nftInitSupply_B],
//           [nftInitSupply_A, nftInitSupply_B],
//           alice.address,
//           deadline
//         );
//     });

//     it('addLiquidity_NFT_NFT must be successfully', async () => {
//       console.log('\n\n\n============Add liquidity NFT_NFT============');
//       let alicePairTokenBalance = parseInt(await pair.balanceOf(alice.address));
//       let aliceERC1155ABalance = parseInt(
//         await erc1155_A.balanceOf(alice.address, tokenId)
//       );
//       let aliceERC1155BBalance = parseInt(
//         await erc1155_B.balanceOf(alice.address, tokenId)
//       );

//       let pairWrappedERC1155ABalance = parseInt(
//         await wrappedERC1155_A.balanceOf(pair.address)
//       );
//       let pairWrappedERC1155BBalance = parseInt(
//         await wrappedERC1155_B.balanceOf(pair.address)
//       );

//       console.log('Alice pair token balance: ', alicePairTokenBalance);
//       console.log('Alice ERC1155 A balance: ', aliceERC1155ABalance);
//       console.log('Alice ERC1155 B balance: ', aliceERC1155BBalance);
//       console.log(
//         'Pair WrappedERC1155 A balance: ',
//         pairWrappedERC1155ABalance
//       );
//       console.log(
//         'Pair WrappedERC1155 B balance: ',
//         pairWrappedERC1155BBalance
//       );
//     });

//     it('removeLiquidity_NFT_NFT successfully', async () => {
//       console.log('\n\n\n============Remove liquidity NFT_NFT============');

//       await pair
//         .connect(alice)
//         .approve(erc1155erc1155Router.address, '4100000000000000000');

//       await erc1155erc1155Router
//         .connect(alice)
//         .removeLiquidity_NFT_NFT(
//           [erc1155_A.address, erc1155_B.address],
//           [tokenId, tokenId],
//           ['3', '3'],
//           ['0x', '0x'],
//           '4100000000000000000',
//           alice.address,
//           deadline
//         );

//       let alicePairTokenBalance = parseInt(await pair.balanceOf(alice.address));
//       let aliceERC1155ABalance = parseInt(
//         await erc1155_A.balanceOf(alice.address, tokenId)
//       );
//       let aliceERC1155BBalance = parseInt(
//         await erc1155_B.balanceOf(alice.address, tokenId)
//       );
//       let aliceWrappedERC1155ABalance = parseInt(
//         await wrappedERC1155_A.balanceOf(alice.address)
//       );
//       let aliceWrappedERC1155BBalance = parseInt(
//         await wrappedERC1155_B.balanceOf(alice.address)
//       );

//       let pairWrappedERC1155ABalance = parseInt(
//         await wrappedERC1155_A.balanceOf(pair.address)
//       );

//       let pairWrappedERC1155BBalance = parseInt(
//         await wrappedERC1155_B.balanceOf(pair.address)
//       );

//       console.log('Alice Pair Token balance: ', alicePairTokenBalance);
//       console.log('Alice ERC1155 A balance: ', aliceERC1155ABalance);
//       console.log('Alice ERC1155 B balance: ', aliceERC1155BBalance);
//       console.log(
//         'Alice WrappedERC1155 A balance: ',
//         aliceWrappedERC1155ABalance
//       );

//       console.log(
//         'Alice WrappedERC1155 B balance: ',
//         aliceWrappedERC1155BBalance
//       );
//       console.log(
//         'Pair WrappedERC1155 A balance: ',
//         pairWrappedERC1155ABalance
//       );
//       console.log(
//         'Pair WrappedERC1155 B balance: ',
//         pairWrappedERC1155BBalance
//       );
//     });

//     it('Bob swaps exact NFTs for NFTs', async () => {
//       console.log(
//         '\n\n\n============Bob swaps exact NFTs for NFTs============'
//       );

//       await erc1155_A.connect(deployer).mint(bob.address, tokenId, '5', '0x');

//       await erc1155_A
//         .connect(bob)
//         .setApprovalForAll(erc1155erc1155Router.address, true);

//       await erc1155erc1155Router
//         .connect(bob)
//         .swapExactNFTsForNFTs(
//           '2',
//           '1',
//           [erc1155_A.address, erc1155_B.address],
//           [tokenId, tokenId],
//           bob.address,
//           deadline,
//           '0x'
//         );

//       let bobERC1155ABalance = parseInt(
//         await erc1155_A.balanceOf(bob.address, tokenId)
//       );
//       let bobERC1155BBalance = parseInt(
//         await erc1155_B.balanceOf(bob.address, tokenId)
//       );
//       let bobWrappedERC1155BBalance = parseInt(
//         await wrappedERC1155_B.balanceOf(bob.address)
//       );

//       let pairWrappedERC1155ABalance = parseInt(
//         await wrappedERC1155_A.balanceOf(pair.address)
//       );
//       let pairWrappedERC1155BBalance = parseInt(
//         await wrappedERC1155_B.balanceOf(pair.address)
//       );

//       console.log('Bob ERC1155 A balance: ', bobERC1155ABalance);
//       console.log('Bob ERC1155 B balance: ', bobERC1155BBalance);
//       console.log('Bob WrappedERC1155 B balance: ', bobWrappedERC1155BBalance);
//       console.log(
//         'Pair WrappedERC1155 A balance: ',
//         pairWrappedERC1155ABalance
//       );
//       console.log(
//         'Pair WrappedERC1155 B balance: ',
//         pairWrappedERC1155BBalance
//       );
//     });

//     it('Bob swaps NFTs for exact NFTs', async () => {
//       console.log(
//         '\n\n\n============Bob swaps NFTs for exact NFTs============'
//       );

//       await erc1155_A.connect(deployer).mint(bob.address, tokenId, '5', '0x');

//       await erc1155_A
//         .connect(bob)
//         .setApprovalForAll(erc1155erc1155Router.address, true);

//       await erc1155erc1155Router
//         .connect(bob)
//         .swapNFTsForExactNFTs(
//           '1',
//           '2',
//           [erc1155_A.address, erc1155_B.address],
//           [tokenId, tokenId],
//           bob.address,
//           deadline,
//           '0x'
//         );

//       let bobERC1155ABalance = parseInt(
//         await erc1155_A.balanceOf(bob.address, tokenId)
//       );
//       let bobERC1155BBalance = parseInt(
//         await erc1155_B.balanceOf(bob.address, tokenId)
//       );
//       let bobWrappedERC1155ABalance = parseInt(
//         await wrappedERC1155_A.balanceOf(bob.address)
//       );

//       let pairWrappedERC1155ABalance = parseInt(
//         await wrappedERC1155_A.balanceOf(pair.address)
//       );
//       let pairWrappedERC1155BBalance = parseInt(
//         await wrappedERC1155_B.balanceOf(pair.address)
//       );

//       console.log('Bob ERC1155 A balance: ', bobERC1155ABalance);
//       console.log('Bob ERC1155 B balance: ', bobERC1155BBalance);
//       console.log('Bob WrappedERC1155 A balance: ', bobWrappedERC1155ABalance);
//       console.log(
//         'Pair WrappedERC1155 A balance: ',
//         pairWrappedERC1155ABalance
//       );
//       console.log(
//         'Pair WrappedERC1155 B balance: ',
//         pairWrappedERC1155BBalance
//       );
//     });
//   });
// });
