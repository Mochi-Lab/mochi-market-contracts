/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('ERC1155_Token Router', async () => {
  let deployer, alice, bob;
  let factory, rootRouter, erc1155TokenRouter;
  let weth, erc1155, erc20, wrappedERC1155, pair;
  let tokenId = '0';

  let aliceInitNftBalance = 1000;
  let aliceInitTokenBalance = 1000000000000000000000n;

  let bobInitTokenBalance = 1000000000000000000000n;

  let nftInitSupply = 5;
  let tokenInitSupply = 100000000000000000000n;

  let deadline = '1701547000';

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    let Factory = await ethers.getContractFactory('Factory');
    factory = await Factory.connect(deployer).deploy(deployer.address);

    let WETH = await ethers.getContractFactory('WETH9');
    weth = await WETH.connect(deployer).deploy();

    let TestERC20 = await ethers.getContractFactory('TestERC20');
    erc20 = await TestERC20.connect(deployer).deploy('TestERC20', 'TestERC20');

    let RootRouter = await ethers.getContractFactory('RootRouter');
    rootRouter = await RootRouter.connect(deployer).deploy(
      factory.address,
      weth.address
    );

    let ERC1155_Token_Router = await ethers.getContractFactory(
      'ERC1155_Token_Router'
    );
    erc1155TokenRouter = await ERC1155_Token_Router.connect(deployer).deploy(
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

    await erc20.connect(deployer).mint(alice.address, aliceInitTokenBalance);
    await erc20.connect(deployer).mint(bob.address, bobInitTokenBalance);

    await erc1155
      .connect(deployer)
      .mint(alice.address, tokenId, aliceInitNftBalance, '0x');

    await erc1155
      .connect(alice)
      .setApprovalForAll(erc1155TokenRouter.address, true);

    await factory
      .connect(deployer)
      .createPair(wrappedERC1155.address, erc20.address);

    console.log('ERC1155 address: ', erc1155.address);
    console.log('Token ERC20 address: ', erc20.address);
    console.log('Wrapped token for ERC1155: ', wrappedERC1155.address);
    console.log(
      'Get pair in Factory: ',
      await factory.getPair(wrappedERC1155.address, erc20.address)
    );
    console.log(
      'Get pair for by calculation in Root Router: ',
      await rootRouter.getPairFor(wrappedERC1155.address, erc20.address)
    );
    pair = await ethers.getContractAt(
      'MochiswapPair',
      await factory.getPair(wrappedERC1155.address, erc20.address)
    );
    console.log(
      'Alice ETH balance: ',
      parseInt(await ethers.provider.getBalance(alice.address))
    );
  });

  it('All setup successfully', async () => {
    expect(
      await factory.getPair(wrappedERC1155.address, erc20.address)
    ).to.be.equal(
      await rootRouter.getPairFor(wrappedERC1155.address, erc20.address)
    );
  });

  context('Alice addLiquidity_NFT_Token successfully', async () => {
    beforeEach(async () => {
      await erc20
        .connect(alice)
        .approve(erc1155TokenRouter.address, tokenInitSupply);

      await erc1155TokenRouter
        .connect(alice)
        .addLiquidity_NFT_Token(
          erc1155.address,
          tokenId,
          nftInitSupply,
          nftInitSupply,
          erc20.address,
          tokenInitSupply,
          tokenInitSupply,
          alice.address,
          deadline
        );
    });

    it('addLiquidity_NFT_ETH must be successfully', async () => {
      console.log('\n\n\n============Add liquidity NFT_ETH============');

      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );

      let aliceWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(alice.address)
      );

      let alicePairTokenBalance = parseInt(await pair.balanceOf(alice.address));

      let aliceErc20Balance = parseInt(await erc20.balanceOf(alice.address));

      let aliceERC1155Balance = parseInt(
        await erc1155.balanceOf(alice.address, tokenId)
      );

      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Alice wrappedERC1155 balance: ', aliceWrappedERC1155Balance);
      console.log('Alice pair token balance: ', alicePairTokenBalance);

      console.log('Alice Token ERC20 balance: ', aliceErc20Balance);
      console.log('Alice ERC1155 balance', aliceERC1155Balance);

      expect(pairWrappedERC1155Balance).to.be.equal(
        nftInitSupply * parseInt(await wrappedERC1155.unit())
      );

      expect(aliceWrappedERC1155Balance).to.be.equal(0);
      expect(alicePairTokenBalance).to.be.greaterThan(0);
      expect(aliceERC1155Balance).to.be.equal(
        aliceInitNftBalance - nftInitSupply
      );
    });

    it('removeLiquidity_NFT_ETH successfully', async () => {
      console.log('\n\n\n============Remove liquidity NFT_Token============');

      await pair
        .connect(alice)
        .approve(erc1155TokenRouter.address, '20000000000000000000');

      await erc1155TokenRouter
        .connect(alice)
        .removeLiquidity_NFT_Token(
          erc1155.address,
          tokenId,
          '4',
          erc20.address,
          '80000000000000000000',
          '20000000000000000000',
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
      let aliceERC20Balance = parseInt(await erc20.balanceOf(alice.address));
      let aliceERC1155Balance = parseInt(
        await erc1155.balanceOf(alice.address, tokenId)
      );

      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Alice wrappedERC1155 balance: ', aliceWrappedERC1155Balance);
      console.log('Alice pair token balance: ', alicePairTokenBalance);
      console.log('Alice Token ERC20 balance: ', aliceERC20Balance);
      console.log('Alice erc1155 balance', aliceERC1155Balance);

      expect(aliceERC1155Balance).to.be.equal(
        aliceInitNftBalance -
          (pairWrappedERC1155Balance + aliceWrappedERC1155Balance) /
            (await wrappedERC1155.unit())
      );
    });

    it('Bob swaps exact Token for NFT successfully', async () => {
      console.log(
        '\n\n\n============Bob swaps exact tokens for nfts ============'
      );

      let amountSwap = (tokenInitSupply * BigInt(3)) / BigInt(10);
      let amounts = await rootRouter.getAmountsOut(amountSwap, [
        erc20.address,
        wrappedERC1155.address,
      ]);

      let wrappedERC1155BalanceExpect = parseInt(amounts[1]);
      let amountERC1155OutMin = parseInt(
        wrappedERC1155BalanceExpect / (await wrappedERC1155.unit())
      );

      await erc20.connect(bob).approve(erc1155TokenRouter.address, amountSwap);

      await erc1155TokenRouter
        .connect(bob)
        .swapExactTokensForNFTs(
          amountSwap,
          amountERC1155OutMin,
          erc20.address,
          [erc1155.address],
          [tokenId],
          bob.address,
          deadline,
          '0x'
        );

      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );

      let bobWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(bob.address)
      );
      let bobTokenERC20Balance = parseInt(await erc20.balanceOf(bob.address));
      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );
      let pairTokenERC20Balance = parseInt(await erc20.balanceOf(pair.address));

      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
      console.log('Bob wrappedERC1155 balance: ', bobWrappedERC1155Balance);
      console.log('Bob token ERC20 balance: ', bobTokenERC20Balance);
      console.log('Pair wrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Pair token ERC20 balance: ', pairTokenERC20Balance);

      expect(bobERC1155Balance).to.be.equal(amountERC1155OutMin);
    });

    it('Bob swaps exact NFT for Token successfully', async () => {
      console.log('\n\n\n============Swap exact NFT for Token============');
      await erc1155.connect(deployer).mint(bob.address, tokenId, '5', '0x');
      await erc1155
        .connect(bob)
        .setApprovalForAll(erc1155TokenRouter.address, true);

      await erc1155TokenRouter
        .connect(bob)
        .swapExactNFTsForTokens(
          '1',
          '10000000000000000000',
          erc1155.address,
          tokenId,
          [erc20.address],
          bob.address,
          deadline
        );

      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );

      let bobWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(bob.address)
      );

      let bobERC20Balance = parseInt(await erc20.balanceOf(bob.address));

      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );

      let pairERC20Balance = parseInt(await erc20.balanceOf(pair.address));

      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
      console.log('Bob WrappedERC1155 balance: ', bobWrappedERC1155Balance);
      console.log('Bob ERC20 balance: ', bobERC20Balance);
      console.log('Pair WrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Pair ERC20 balance: ', pairERC20Balance);
    });

    it('Bobs swaps Token for exact NFTs', async () => {
      console.log('\n\n\n============Swap  Token for exact NFT============');

      await erc20
        .connect(bob)
        .approve(erc1155TokenRouter.address, '100000000000000000000');

      await erc1155TokenRouter
        .connect(bob)
        .swapTokensForExactNFTs(
          '1',
          '100000000000000000000',
          erc20.address,
          [erc1155.address],
          [tokenId],
          bob.address,
          deadline,
          '0x'
        );
      let bobERC20Balance = parseInt(await erc20.balanceOf(bob.address));
      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );
      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );
      let pairERC20Balance = parseInt(await erc20.balanceOf(pair.address));

      console.log('Bob ERC20 balance: ', bobERC20Balance);
      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
      console.log('Pair WrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Pair ERC20 balance: ', pairERC20Balance);
    });

    it('Bob swaps NFT for exact Token', async () => {
      console.log('\n\n\n============Swap NFT for exact Token============');
      await erc1155.connect(deployer).mint(bob.address, tokenId, '5', '0x');
      await erc1155
        .connect(bob)
        .setApprovalForAll(erc1155TokenRouter.address, true);

      await erc1155TokenRouter
        .connect(bob)
        .swapNFTsForExactTokens(
          '10000000000000000000',
          '1',
          erc1155.address,
          tokenId,
          [erc20.address],
          bob.address,
          deadline
        );

      let bobERC1155Balance = parseInt(
        await erc1155.balanceOf(bob.address, tokenId)
      );

      let bobWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(bob.address)
      );

      let bobERC20Balance = parseInt(await erc20.balanceOf(bob.address));

      let pairWrappedERC1155Balance = parseInt(
        await wrappedERC1155.balanceOf(pair.address)
      );

      let pairERC20Balance = parseInt(await erc20.balanceOf(pair.address));

      console.log('Bob ERC1155 balance: ', bobERC1155Balance);
      console.log('Bob WrappedERC1155 balance: ', bobWrappedERC1155Balance);
      console.log('Bob ERC20 balance: ', bobERC20Balance);
      console.log('Pair WrappedERC1155 balance: ', pairWrappedERC1155Balance);
      console.log('Pair ERC20 balance: ', pairERC20Balance);
    });
  });
});
