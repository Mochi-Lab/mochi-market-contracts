/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('ERC1155_ETH Router', async () => {
  let deployer, alice, bob;
  let factory, rootRouter, erc1155EthRouter;
  let weth, erc1155, wrappedERC1155, pair;
  let tokenId = '0';
  let aliceNftBalance = 1000;
  let nftInitSupply = 5;
  let ethInitSupply = 1000000000000000000n;
  let deadline = '1701547000';

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    let Factory = await ethers.getContractFactory('Factory');
    factory = await Factory.connect(deployer).deploy(deployer.address);

    let WETH = await ethers.getContractFactory('WETH9');
    weth = await WETH.connect(deployer).deploy();

    let RootRouter = await ethers.getContractFactory('RootRouter');
    rootRouter = await RootRouter.connect(deployer).deploy(
      factory.address,
      weth.address
    );

    let ERC1155_ETH_Router = await ethers.getContractFactory(
      'ERC1155_ETH_Router'
    );
    erc1155EthRouter = await ERC1155_ETH_Router.connect(deployer).deploy(
      rootRouter.address
    );

    let TestERC1155 = await ethers.getContractFactory('TestERC1155');
    erc1155 = await TestERC1155.connect(deployer).deploy('TestUriA');

    await factory
      .connect(deployer)
      .createWrappedTokenForERC1155(erc1155.address, tokenId);

    wrappedERC1155 = await ethers.getContractAt(
      'WrappedERC1155',
      await factory.getWrappedERC1155(erc1155.address, tokenId)
    );

    await erc1155
      .connect(deployer)
      .mint(alice.address, tokenId, aliceNftBalance, '0x');

    await erc1155
      .connect(alice)
      .setApprovalForAll(erc1155EthRouter.address, true);

    await factory
      .connect(deployer)
      .createPair(wrappedERC1155.address, weth.address);

    console.log('ERC1155 address: ', erc1155.address);
    console.log('WETH address: ', weth.address);
    console.log('Wrapped token for ERC1155: ', wrappedERC1155.address);
    console.log(
      'Get pair in Factory: ',
      await factory.getPair(wrappedERC1155.address, weth.address)
    );
    console.log(
      'Get pair for by calculation in Root Router: ',
      await rootRouter.getPairFor(wrappedERC1155.address, weth.address)
    );
    pair = await ethers.getContractAt(
      'MochiswapPair',
      await factory.getPair(wrappedERC1155.address, weth.address)
    );
    console.log(
      'Alice ETH balance: ',
      parseInt(await ethers.provider.getBalance(alice.address))
    );
  });

  it('All setup successfully', async () => {
    expect(
      await factory.getPair(wrappedERC1155.address, weth.address)
    ).to.be.equal(
      await rootRouter.getPairFor(wrappedERC1155.address, weth.address)
    );
  });

  context('Alice addLiquidity_NFT_ETH successfully', async () => {
    beforeEach(async () => {
      await erc1155EthRouter
        .connect(alice)
        .addLiquidity_NFT_ETH(
          erc1155.address,
          tokenId,
          nftInitSupply,
          nftInitSupply,
          ethInitSupply,
          alice.address,
          deadline,
          {
            value: ethInitSupply,
          }
        );
    });

    it('addLiquidity_NFT_ETH must be successfully', async () => {
      console.log('\n\n\n============Add liquidity NFT_ETH============');

      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );

      let pairWETHBalance = parseInt(await weth.balanceOf(pair.address));

      let aliceWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(alice.address)
      );

      let alicePairTokenBalance = parseInt(await pair.balanceOf(alice.address));

      let aliceEthBalance = parseInt(
        await ethers.provider.getBalance(alice.address)
      );

      let aliceERC1155Balance = parseInt(
        await erc1155.balanceOf(alice.address, tokenId)
      );

      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Pair WETH balance: ', pairWETHBalance);
      console.log('Alice wrappedERC1155 balance: ', aliceWrappedERC1155Balance);
      console.log('Alice pair token balance: ', alicePairTokenBalance);

      console.log('Alice ETH balance: ', aliceEthBalance);
      console.log('Alice erc1155 balance', aliceERC1155Balance);

      expect(pairWrappedERC1155Balance).to.be.equal(
        nftInitSupply * parseInt(await wrappedERC1155.unit())
      );

      expect(aliceWrappedERC1155Balance).to.be.equal(0);
      expect(alicePairTokenBalance).to.be.greaterThan(0);
      expect(aliceERC1155Balance).to.be.equal(aliceNftBalance - nftInitSupply);
    });

    it('removeLiquidity_NFT_ETH successfully', async () => {
      console.log('\n\n\n============Remove liquidity NFT_ETH============');

      await pair
        .connect(alice)
        .approve(erc1155EthRouter.address, '2000000000000000000');

      await erc1155EthRouter
        .connect(alice)
        .removeLiquidity_NFT_ETH(
          erc1155.address,
          tokenId,
          '4',
          '2000000000000000000',
          '500000000000000000',
          alice.address,
          deadline,
          '0x'
        );

      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );
      let aliceWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(alice.address)
      );
      let alicePairTokenBalance = parseInt(await pair.balanceOf(alice.address));
      let aliceEthBalance = parseInt(
        await ethers.provider.getBalance(alice.address)
      );
      let aliceERC1155Balance = parseInt(
        await erc1155.balanceOf(alice.address, tokenId)
      );

      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Alice wrappedERC1155 balance: ', aliceWrappedERC1155Balance);
      console.log('Alice pair token balance: ', alicePairTokenBalance);
      console.log('Alice ETH balance: ', aliceEthBalance);
      console.log('Alice erc1155 balance', aliceERC1155Balance);

      expect(aliceERC1155Balance).to.be.equal(
        aliceNftBalance -
          (pairWrappedERC1155Balance + aliceWrappedERC1155Balance) /
            (await wrappedERC1155.unit())
      );
    });

    it('Bob swaps exact ETH for ERC1155 successfully', async () => {
      console.log('\n\n\n============Bob swaps exact ETH for NFT============');
      await erc1155EthRouter
        .connect(bob)
        .swapExactETHForNFTs(
          '1',
          [erc1155.address],
          [tokenId],
          bob.address,
          deadline,
          '0x',
          { value: '500000000000000000' }
        );
      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );
      let pairWETHBalance = parseInt(await weth.balanceOf(pair.address));

      let bobWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(bob.address)
      );
      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );

      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Pair WETH balance: ', pairWETHBalance);
      console.log('Bob wrappedERC1155 balance: ', bobWrappedERC1155Balance);
      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
    });

    it('Bob swaps exact NFT for ETH', async () => {
      console.log('\n\n\n============Bob swaps exact NFT for ETH============');

      await erc1155.connect(deployer).mint(bob.address, tokenId, '5', '0x');
      await erc1155
        .connect(bob)
        .setApprovalForAll(erc1155EthRouter.address, true);
      await erc1155EthRouter
        .connect(bob)
        .swapExactNFTsForETH(
          '1',
          '100000000000000000',
          erc1155.address,
          tokenId,
          bob.address,
          deadline
        );

      let bobETHBalance = parseInt(
        await ethers.provider.getBalance(bob.address)
      );

      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );

      let pairWETHBalance = parseInt(await weth.balanceOf(pair.address));
      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );

      console.log('Bob ETH balance: ', bobETHBalance);
      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
      console.log('Pair WETH balance: ', pairWETHBalance);
      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
    });

    it('Bob swaps ETH for exact NFTs', async () => {
      console.log('\n\n\n============Bob swaps ETH for exact NFTs============');

      await erc1155EthRouter
        .connect(bob)
        .swapETHForExactNFTs(
          '1',
          [erc1155.address],
          [tokenId],
          bob.address,
          deadline,
          '0x',
          { value: '500000000000000000' }
        );
      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );

      let bobETHBalance = parseInt(
        await ethers.provider.getBalance(bob.address)
      );
      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );
      let pairWETHBalance = parseInt(await weth.balanceOf(pair.address));

      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
      console.log('Bob ETH balance: ', bobETHBalance);
      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Pair WETH balance: ', pairWETHBalance);
    });

    it('Bob swaps NFTs for exact ETH', async () => {
      console.log('\n\n\n============Bob swaps NFTs for exact ETH============');

      await erc1155.connect(deployer).mint(bob.address, tokenId, '5', '0x');
      await erc1155
        .connect(bob)
        .setApprovalForAll(erc1155EthRouter.address, true);

      await erc1155EthRouter
        .connect(bob)
        .swapNFTsForExactETH(
          '100000000000000000',
          '1',
          erc1155.address,
          tokenId,
          bob.address,
          deadline
        );

      let pairWETHBalance = parseInt(await weth.balanceOf(pair.address));
      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );

      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );

      let bobWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(bob.address)
      );

      let bobETHBalance = parseInt(
        await ethers.provider.getBalance(bob.address)
      );

      console.log('Pair WETH balance: ', pairWETHBalance);
      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
      console.log('Bob wrappedERC1155 balance: ', bobWrappedERC1155Balance);
      console.log('Bob ETH balance: ', bobETHBalance);
    });
  });
});
