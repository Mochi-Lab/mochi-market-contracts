/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('NFTRouter', async () => {
  let deployer, alice, bob;
  let factory,
    router,
    weth,
    testERC20,
    testERC1155_A,
    testERC1155_B,
    nftRouter,
    wrappedERC1155,
    pair;
  let tokenId_A = '0';
  let tokenId_B = '0';
  let deadline = '1701547000';

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    let Factory = await ethers.getContractFactory('Factory');
    factory = await Factory.connect(deployer).deploy(deployer.address);

    let WETH = await ethers.getContractFactory('WETH9');
    weth = await WETH.connect(deployer).deploy();

    let Router = await ethers.getContractFactory('Router');
    router = await Router.connect(deployer).deploy(factory.address, weth.address);

    let NFTRouter = await ethers.getContractFactory('NFTRouter');
    nftRouter = await NFTRouter.connect(deployer).deploy(router.address);

    let TestERC20 = await ethers.getContractFactory('TestERC20');
    testERC20 = await TestERC20.connect(deployer).deploy('ERC20-A', 'ERC20-A');

    let TestERC1155 = await ethers.getContractFactory('TestERC1155');

    testERC1155_A = await TestERC1155.connect(deployer).deploy('TestUriA');
    await testERC1155_A.connect(deployer).mint(alice.address, tokenId_A, '1000', '0x');
    await testERC1155_A.connect(alice).setApprovalForAll(nftRouter.address, true);

    testERC1155_B = await TestERC1155.connect(deployer).deploy('TestUriB');
    await testERC1155_B.connect(deployer).mint(alice.address, tokenId_B, '1000', '0x');
    await testERC1155_B.connect(alice).setApprovalForAll(nftRouter.address, true);

    await testERC20.connect(deployer).mint(alice.address, '500000000000000000000');

    await testERC20.connect(alice).approve(nftRouter.address, '5000000000000000000');

    await testERC20.connect(deployer).mint(bob.address, '500000000000000000000');

    await testERC20.connect(bob).approve(nftRouter.address, '5000000000000000000');

    await factory.connect(deployer).createPair(testERC20.address, weth.address);

    console.log('Get pair: ', await factory.getPair(testERC20.address, weth.address));
    console.log('Get pair for: ', await router.getPairFor(testERC20.address, weth.address));
  });

  it('addLiquidity_NFT_ETH and removeLiquidity_NFT_ETH successfully', async () => {
    await nftRouter
      .connect(alice)
      .addLiquidity_NFT_ETH(
        testERC1155_A.address,
        tokenId_A,
        '5',
        '4',
        '1000000000000000000',
        alice.address,
        deadline,
        {
          value: '1000000000000000000',
        }
      );

    console.log(
      'WrappedERC1155 address: ',
      await nftRouter.wrappedERC1155(testERC1155_A.address, tokenId_A)
    );

    console.log('\n\n\n============Add liquidity NFT_ETH============');

    wrappedERC1155 = await ethers.getContractAt(
      'WrappedERC1155',
      await nftRouter.wrappedERC1155(testERC1155_A.address, tokenId_A)
    );

    pair = await ethers.getContractAt(
      'Pair',
      await factory.getPair(wrappedERC1155.address, weth.address)
    );

    console.log(
      'Pair wrappedERC1155 balance: ',
      parseInt(await wrappedERC1155.balanceOf(pair.address))
    );

    console.log(
      'Alice wrappedERC1155 balance: ',
      parseInt(await wrappedERC1155.balanceOf(alice.address))
    );
    console.log('Alice pair token balance: ', parseInt(await pair.balanceOf(alice.address)));
    let aliceBeforeBalance = parseInt(await ethers.provider.getBalance(alice.address));
    console.log('Alice ETH balance: ', aliceBeforeBalance);
    console.log(
      'Alice erc1155 balance',
      parseInt(await testERC1155_A.balanceOf(alice.address, tokenId_A))
    );

    console.log('\n\n\n============Remove liquidity NFT_ETH============');

    await pair.connect(alice).approve(nftRouter.address, '2000000000000000000');
    await nftRouter
      .connect(alice)
      .removeLiquidity_NFT_ETH(
        testERC1155_A.address,
        tokenId_A,
        '4',
        '2000000000000000000',
        '500000000000000000',
        alice.address,
        deadline
      );

    console.log(
      'Pair wrappedERC1155 balance: ',
      parseInt(await wrappedERC1155.balanceOf(pair.address))
    );

    console.log(
      'Alice wrappedERC1155 balance: ',
      parseInt(await wrappedERC1155.balanceOf(alice.address))
    );
    console.log('Alice pair token balance: ', parseInt(await pair.balanceOf(alice.address)));
    let aliceAfterBalance = parseInt(await ethers.provider.getBalance(alice.address));
    console.log('Alice ETH balance: ', aliceAfterBalance);
    console.log(
      'Alice erc1155 balance: ',
      parseInt(await testERC1155_A.balanceOf(alice.address, tokenId_A))
    );
    console.log('Alice difference: ', aliceAfterBalance - aliceBeforeBalance);
  });

  it('addLiquidity_NFT_NFT and removeLiquidity_NFT_NFT successfully', async () => {
    await nftRouter
      .connect(alice)
      .addLiquidity_NFT_NFT(
        testERC1155_A.address,
        tokenId_A,
        '5',
        '4',
        testERC1155_B.address,
        tokenId_B,
        '5',
        '4',
        alice.address,
        deadline
      );

    console.log(
      'wrappedERC1155_A address: ',
      await nftRouter.wrappedERC1155(testERC1155_A.address, tokenId_A)
    );

    console.log(
      'wrappedERC1155_B address: ',
      await nftRouter.wrappedERC1155(testERC1155_B.address, tokenId_B)
    );

    console.log('\n\n\n============Add liquidity NFT_NFT============');

    wrappedERC1155_A = await ethers.getContractAt(
      'WrappedERC1155',
      await nftRouter.wrappedERC1155(testERC1155_A.address, tokenId_A)
    );

    wrappedERC1155_B = await ethers.getContractAt(
      'WrappedERC1155',
      await nftRouter.wrappedERC1155(testERC1155_B.address, tokenId_B)
    );

    pair = await ethers.getContractAt(
      'Pair',
      await factory.getPair(wrappedERC1155_A.address, wrappedERC1155_B.address)
    );

    console.log(
      'Pair wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(pair.address))
    );
    console.log(
      'Pair wrappedERC1155_B balance: ',
      parseInt(await wrappedERC1155_B.balanceOf(pair.address))
    );
    console.log(
      'Alice wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(alice.address))
    );
    console.log(
      'Alice wrappedERC1155_B balance: ',
      parseInt(await wrappedERC1155_B.balanceOf(alice.address))
    );
    console.log('Alice pair token balance: ', parseInt(await pair.balanceOf(alice.address)));
    console.log(
      'Alice erc1155_A balance',
      parseInt(await testERC1155_A.balanceOf(alice.address, tokenId_A))
    );
    console.log(
      'Alice erc1155_B balance',
      parseInt(await testERC1155_B.balanceOf(alice.address, tokenId_A))
    );

    console.log('\n\n\n============Remove liquidity NFT_NFT============');
    await pair.connect(alice).approve(nftRouter.address, '4900000000000000000');
    await nftRouter
      .connect(alice)
      .removeLiquidity_NFT_NFT(
        testERC1155_A.address,
        tokenId_A,
        '4',
        testERC1155_B.address,
        tokenId_B,
        '4',
        '4900000000000000000',
        alice.address,
        deadline
      );

    console.log(
      'Pair wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(pair.address))
    );
    console.log(
      'Pair wrappedERC1155_B balance: ',
      parseInt(await wrappedERC1155_B.balanceOf(pair.address))
    );
    console.log(
      'Alice wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(alice.address))
    );
    console.log(
      'Alice wrappedERC1155_B balance: ',
      parseInt(await wrappedERC1155_B.balanceOf(alice.address))
    );
    console.log('Alice pair token balance: ', parseInt(await pair.balanceOf(alice.address)));
    console.log(
      'Alice erc1155_A balance',
      parseInt(await testERC1155_A.balanceOf(alice.address, tokenId_A))
    );
    console.log(
      'Alice erc1155_B balance',
      parseInt(await testERC1155_B.balanceOf(alice.address, tokenId_A))
    );
  });

  it('addLiquidity_NFT_Token and removeLiquidity_NFT_Token successfully', async () => {
    await nftRouter
      .connect(alice)
      .addLiquidity_NFT_Token(
        testERC1155_A.address,
        tokenId_A,
        '5',
        '4',
        testERC20.address,
        '5000000000000000000',
        '4000000000000000000',
        alice.address,
        deadline
      );

    console.log(
      'wrappedERC1155_A address: ',
      await nftRouter.wrappedERC1155(testERC1155_A.address, tokenId_A)
    );

    console.log('\n\n\n============Add liquidity NFT_NFT============');

    wrappedERC1155_A = await ethers.getContractAt(
      'WrappedERC1155',
      await nftRouter.wrappedERC1155(testERC1155_A.address, tokenId_A)
    );

    pair = await ethers.getContractAt(
      'Pair',
      await factory.getPair(wrappedERC1155_A.address, testERC20.address)
    );

    console.log(
      'Pair wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(pair.address))
    );
    console.log(
      'Alice wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(alice.address))
    );
    console.log('Alice testERC20 balance: ', parseInt(await testERC20.balanceOf(alice.address)));
    console.log('Alice pair token balance: ', parseInt(await pair.balanceOf(alice.address)));
    console.log(
      'Alice erc1155_A balance',
      parseInt(await testERC1155_A.balanceOf(alice.address, tokenId_A))
    );

    console.log('\n\n\n============Remove liquidity NFT_Token============');
    await pair.connect(alice).approve(nftRouter.address, '4900000000000000000');
    await nftRouter
      .connect(alice)
      .removeLiquidity_NFT_Token(
        testERC1155_A.address,
        tokenId_A,
        '4',
        testERC20.address,
        '4000000000000000000',
        '4900000000000000000',
        alice.address,
        deadline
      );

    wrappedERC1155_A = await ethers.getContractAt(
      'WrappedERC1155',
      await nftRouter.wrappedERC1155(testERC1155_A.address, tokenId_A)
    );

    pair = await ethers.getContractAt(
      'Pair',
      await factory.getPair(wrappedERC1155_A.address, testERC20.address)
    );

    console.log(
      'Pair wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(pair.address))
    );
    console.log(
      'Alice wrappedERC1155_A balance: ',
      parseInt(await wrappedERC1155_A.balanceOf(alice.address))
    );
    console.log('Alice testERC20 balance: ', parseInt(await testERC20.balanceOf(alice.address)));
    console.log('Alice pair token balance: ', parseInt(await pair.balanceOf(alice.address)));
    console.log(
      'Alice erc1155_A balance',
      parseInt(await testERC1155_A.balanceOf(alice.address, tokenId_A))
    );
  });
});
