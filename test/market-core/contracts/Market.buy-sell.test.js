/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const {
  deployAddressesProvider,
  allSetup,
  deployTestERC721,
  deployTestERC20,
} = require('../helpers');
const { ERRORS, REGULAR_FEE, MOMA_FEE } = require('../constans');

describe('Market', async () => {
  let addressesProvider, nftList, vault, market, sellOrderList, exchangeOrderList;
  let moma;
  let deployer, marketAdmin, alice, bob;
  let dai, link;
  let ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    [deployer, marketAdmin, alice, bob] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    moma = await deployTestERC20(deployer, 'MOchi MArket Token', 'MOMA');

    let modules = await allSetup(deployer, addressesProvider, deployer, marketAdmin, moma.address);
    addressesProvider = modules.addressesProvider;
    nftList = modules.nftListProxy;
    vault = modules.vaultProxy;
    market = modules.marketProxy;
    sellOrderList = modules.sellOrderListProxy;
    exchangeOrderList = modules.exchangeOrderListProxy;

    let TestERC20 = await ethers.getContractFactory('TestERC20');
    dai = await TestERC20.connect(deployer).deploy('DAI Token', 'DAI');
    link = await TestERC20.connect(deployer).deploy('LINK Token', 'LINK');

    await market.connect(marketAdmin).acceptToken(ETH_ADDRESS);
    await market.connect(marketAdmin).acceptToken(moma.address);
  });

  it('All setup successfully', async () => {
    expect(await nftList.addressesProvider()).to.equal(addressesProvider.address);
    expect(await vault.addressesProvider()).to.equal(addressesProvider.address);
    expect(await sellOrderList.addressesProvider()).to.equal(addressesProvider.address);
    expect(await exchangeOrderList.addressesProvider()).to.equal(addressesProvider.address);
    expect(await market.addressesProvider()).to.equal(addressesProvider.address);
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);

    let regularFee = await market.getRegularFee();
    expect(regularFee[0]).to.be.equal(REGULAR_FEE.NUMERATOR);
    expect(regularFee[1]).to.be.equal(REGULAR_FEE.DENOMINATOR);

    let momaFee = await market.getMomaFee();
    expect(momaFee[0]).to.be.equal(MOMA_FEE.NUMERATOR);
    expect(momaFee[1]).to.be.equal(MOMA_FEE.DENOMINATOR);

    expect(await market.acceptedToken(ETH_ADDRESS)).to.be.equal(true);
    expect(await market.acceptedToken(moma.address)).to.be.equal(true);
  });

  it('User who is not Market Admin calls updateRegularFee fail', async () => {
    await expectRevert(
      market.connect(deployer).updateRegularFee('30', '1000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).updateRegularFee('30', '1000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).updateRegularFee('30', '1000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin calls updateRegularFee successfully', async () => {
    await market.connect(marketAdmin).updateRegularFee('30', '1000');

    let fee = await market.getRegularFee();

    expect(fee[0]).to.equal('30');
    expect(fee[1]).to.equal('1000');
  });

  it('User who is not Market Admin calls acceptToken fail', async () => {
    await expectRevert(
      market.connect(deployer).acceptToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).acceptToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).acceptToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      market.connect(deployer).acceptToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).acceptToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).acceptToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin calls acceptToken successfully', async () => {
    await market.connect(marketAdmin).acceptToken(dai.address);
    await market.connect(marketAdmin).acceptToken(link.address);

    expect(await market.acceptedToken(dai.address)).to.be.equal(true);
    expect(await market.acceptedToken(link.address)).to.be.equal(true);

    let rewardTokenForDai = await ethers.getContractAt(
      'MochiRewardToken',
      await vault.getRewardToken(dai.address)
    );

    let rewardTokenForLink = await ethers.getContractAt(
      'MochiRewardToken',
      await vault.getRewardToken(link.address)
    );

    expect(await rewardTokenForDai.name()).to.be.equal('rMOCHI for ' + (await dai.name()));
    expect(await rewardTokenForDai.symbol()).to.be.equal('rMOCHI_' + (await dai.symbol()));

    expect(await rewardTokenForLink.name()).to.be.equal('rMOCHI for ' + (await link.name()));
    expect(await rewardTokenForLink.symbol()).to.be.equal('rMOCHI_' + (await link.symbol()));
  });

  it('User who is not Market Admin calls revokeToken fail', async () => {
    await market.connect(marketAdmin).acceptToken(dai.address);
    await market.connect(marketAdmin).acceptToken(link.address);

    await expectRevert(
      market.connect(deployer).revokeToken(ETH_ADDRESS),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).revokeToken(ETH_ADDRESS),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).revokeToken(ETH_ADDRESS),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(deployer).revokeToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).revokeToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).revokeToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(deployer).revokeToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).revokeToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).revokeToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin calls revokeToken successfully', async () => {
    await market.connect(marketAdmin).acceptToken(dai.address);
    await market.connect(marketAdmin).acceptToken(link.address);

    await market.connect(marketAdmin).revokeToken(ETH_ADDRESS);
    await market.connect(marketAdmin).revokeToken(dai.address);
    await market.connect(marketAdmin).revokeToken(link.address);

    expect(await market.acceptedToken(ETH_ADDRESS)).to.be.equal(false);
    expect(await market.acceptedToken(dai.address)).to.be.equal(false);
    expect(await market.acceptedToken(link.address)).to.be.equal(false);
  });

  describe('User calls createSellOrder fail cause invalid parameters or caller is not owner or NFT is not approved for Market', async () => {
    let acceptedERC721;
    let tokenId = '0';
    beforeEach(async () => {
      acceptedERC721 = await deployTestERC721(deployer, 'TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(acceptedERC721.address, false);

      await nftList.connect(marketAdmin).acceptNFT(acceptedERC721.address);

      await acceptedERC721.connect(deployer).mint(alice.address, tokenId);
    });

    it('User calls createSellOrder fail with an unregistered NFT', async () => {
      let unregisteredERC721 = await deployTestERC721(deployer, 'TestERC721', 'TestERC721');

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(unregisteredERC721.address, '0', '1', '1000', ETH_ADDRESS),
        ERRORS.NFT_NOT_ACCEPTED
      );
    });

    it('User calls createSellOrder fail with an registered but unaccepted NFT', async () => {
      let unacceptedERC721 = await deployTestERC721(deployer, 'TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(unacceptedERC721.address, false);

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(unacceptedERC721.address, '0', '1', '1000', ETH_ADDRESS),
        ERRORS.NFT_NOT_ACCEPTED
      );
    });

    it('User calls createSellOrder fail cause price is zero', async () => {
      await expectRevert(
        market.connect(alice).createSellOrder(acceptedERC721.address, '0', '1', '0', ETH_ADDRESS),
        ERRORS.PRICE_IS_ZERO
      );
    });

    it('User calls createSellOrder fail cause sells with unaccepted token', async () => {
      let unacceptedToken = await deployTestERC20(deployer, 'TestERC20', 'TestERc20');

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(acceptedERC721.address, '0', '1', '1000', unacceptedToken.address),
        ERRORS.TOKEN_NOT_ACCEPTED
      );
    });

    it('User calls createSellOrder fail cause amount is not equal 1', async () => {
      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(acceptedERC721.address, '0', '0', '1000', ETH_ADDRESS),
        ERRORS.AMOUNT_IS_NOT_EQUAL_ONE
      );

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(acceptedERC721.address, '0', '2', '1000', ETH_ADDRESS),
        ERRORS.AMOUNT_IS_NOT_EQUAL_ONE
      );
    });
  });

  describe('Alice createSellOrder (with ERC721 and ETH) successfully', async () => {
    let erc721;
    let tokenId = 0;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC721 = await ethers.getContractFactory('TestERC721');
      erc721 = await TestERC721.connect(deployer).deploy('TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(erc721.address, false);
      await nftList.connect(marketAdmin).acceptNFT(erc721.address);

      await erc721.connect(deployer).mint(alice.address, tokenId);
      await erc721.connect(alice).setApprovalForAll(market.address, true);
      await market.connect(alice).createSellOrder(erc721.address, tokenId, '1', price, ETH_ADDRESS);
    });

    it('Check sell order info by getSellOrderById', async () => {
      expect(await sellOrderList.getSellOrderCount()).to.be.equal(1);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(1);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(ETH_ADDRESS);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);

      expect(await erc721.ownerOf(tokenId)).to.be.equal(market.address);

      let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('Check sell order info by getSellOrdersByIdList', async () => {
      let result = await sellOrderList.getSellOrdersByIdList([0]);
      let sellOrderInfo = result[0];

      expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(1);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(ETH_ADDRESS);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);
    });

    it('Check sellOrder Id is storaged in arrays', async () => {
      let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
      let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
        alice.address
      );
      let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
        alice.address
      );
      let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
        erc721.address
      );
      let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
        erc721.address
      );

      let availableSellOrdersIdListERC721 = [];
      for (let i = 0; i < availableSellOrdersIdList.resultERC721.length; i++) {
        availableSellOrdersIdListERC721[i] = parseInt(availableSellOrdersIdList.resultERC721[i]);
      }

      let allSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
        allSellOrdersIdListByUserERC721[i] = parseInt(allSellOrdersIdListByUser[i]);
      }

      let availableSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByUser.resultERC721.length; i++) {
        availableSellOrdersIdListByUserERC721[i] = parseInt(
          availableSellOrdersIdListByUser.resultERC721[i]
        );
      }

      let allSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
        allSellOrdersIdListByNftAddressERC721[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
      }

      let availableSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
        availableSellOrdersIdListByNftAddressERC721[i] = parseInt(
          availableSellOrdersIdListByNftAddress[i]
        );
      }

      expect(availableSellOrdersIdListERC721).to.be.include(0);
      expect(allSellOrdersIdListByUserERC721).to.be.include(0);
      expect(availableSellOrdersIdListByUserERC721).to.be.include(0);
      expect(allSellOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableSellOrdersIdListByNftAddressERC721).to.be.include(0);
    });

    it('User who is not seller calls cancelSellOrder fail', async () => {
      await expectRevert(market.connect(bob).cancelSellOrder(0), ERRORS.CALLER_NOT_SELLER);
    });

    it('Seller calls cancelSellOrder successfully', async () => {
      await market.connect(alice).cancelSellOrder(0);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.isActive).to.be.equal(false);

      let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
      let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
        alice.address
      );
      let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
        alice.address
      );
      let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
        erc721.address
      );
      let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
        erc721.address
      );

      let availableSellOrdersIdListERC721 = [];
      for (let i = 0; i < availableSellOrdersIdList.resultERC721.length; i++) {
        availableSellOrdersIdListERC721[i] = parseInt(availableSellOrdersIdList.resultERC721[i]);
      }

      let allSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
        allSellOrdersIdListByUserERC721[i] = parseInt(allSellOrdersIdListByUser[i]);
      }

      let availableSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByUser.resultERC721.length; i++) {
        availableSellOrdersIdListByUserERC721[i] = parseInt(
          availableSellOrdersIdListByUser.resultERC721[i]
        );
      }

      let allSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
        allSellOrdersIdListByNftAddressERC721[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
      }

      let availableSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
        availableSellOrdersIdListByNftAddressERC721[i] = parseInt(
          availableSellOrdersIdListByNftAddress[i]
        );
      }

      expect(availableSellOrdersIdListERC721).to.be.not.include(0);
      expect(allSellOrdersIdListByUserERC721).to.be.include(0);
      expect(availableSellOrdersIdListByUserERC721).to.be.not.include(0);
      expect(allSellOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableSellOrdersIdListByNftAddressERC721).to.be.not.include(0);

      let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('User calls cancelSellOrder fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancelSellOrder(0);
      await expectRevert(market.connect(alice).cancelSellOrder(0), ERRORS.SELL_ORDER_NOT_ACTIVE);
    });

    it('User who is not seller calls updatePrice fail', async () => {
      await expectRevert(market.connect(bob).updatePrice(0, '1000'), ERRORS.CALLER_NOT_SELLER);
    });

    it('User calls updatePrice fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancelSellOrder(0);
      await expectRevert(
        market.connect(alice).updatePrice(0, '1000'),
        ERRORS.SELL_ORDER_NOT_ACTIVE
      );
    });

    it('User calls updatePrice fail cause newPrice equal oldPrice', async () => {
      await expectRevert(market.connect(alice).updatePrice(0, '1000000'), ERRORS.PRICE_NOT_CHANGE);
    });

    it('User calls updatePrice successfully', async () => {
      await market.connect(alice).updatePrice(0, '2000000');

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.price).to.be.equal('2000000');
    });

    it('User calls buy fail cause he is seller', async () => {
      await expectRevert(
        market.connect(alice).buy('0', '1', alice.address, '0x'),
        ERRORS.CALLER_IS_SELLER
      );
    });

    it('User calls buy fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancelSellOrder(0);
      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x'),
        ERRORS.SELL_ORDER_NOT_ACTIVE
      );
    });

    it('User calls buy fail cause amount wants to buy is zero', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '0', bob.address, '0x'),
        ERRORS.AMOUNT_IS_ZERO
      );
    });

    it('User calls buy fail cause amount is not enough', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '2', bob.address, '0x'),
        ERRORS.AMOUNT_IS_NOT_ENOUGH
      );
    });

    it('User calls buy fail cause msg.value is not equal price', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price - 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );

      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price + 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
    });

    describe('User calls buy successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await ethers.provider.getBalance(alice.address);
        await market.connect(bob).buy('0', '1', bob.address, '0x', { value: price });
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await ethers.provider.getBalance(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc721.ownerOf(tokenId)).to.be.equal(bob.address);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await vault.getMochiFund(ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc721.address, ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 20) / 100
        );

        let ethRewardToken = await vault.getRewardToken(ETH_ADDRESS);
        expect(await vault.getRewardTokenBalance(alice.address, ethRewardToken)).to.be.equal(0);
      });

      it('Check sellOrderInfo', async () => {
        let sellOrderInfo = await sellOrderList.getSellOrderById(0);
        expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
        expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
        expect(sellOrderInfo.amount).to.be.equal(1);
        expect(sellOrderInfo.soldAmount).to.be.equal(1);
        expect(sellOrderInfo.seller).to.be.equal(alice.address);
        expect(sellOrderInfo.price).to.be.equal(price);
        expect(sellOrderInfo.token).to.be.equal(ETH_ADDRESS);
        expect(sellOrderInfo.isActive).to.be.equal(false);
        expect(sellOrderInfo.buyers).to.be.include(bob.address);
        expect(sellOrderInfo.buyTimes.length).to.be.equal(1);
        expect(await erc721.ownerOf(tokenId)).to.be.equal(bob.address);

        let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });

      it('Check arrays', async () => {
        let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
        let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
          alice.address
        );
        let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
          alice.address
        );
        let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
          erc721.address
        );
        let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
          erc721.address
        );

        let availableSellOrdersIdListERC721 = [];
        for (let i = 0; i < availableSellOrdersIdList.resultERC721.length; i++) {
          availableSellOrdersIdListERC721[i] = parseInt(availableSellOrdersIdList.resultERC721[i]);
        }

        let allSellOrdersIdListByUserERC721 = [];
        for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
          allSellOrdersIdListByUserERC721[i] = parseInt(allSellOrdersIdListByUser[i]);
        }

        let availableSellOrdersIdListByUserERC721 = [];
        for (let i = 0; i < availableSellOrdersIdListByUser.resultERC721.length; i++) {
          availableSellOrdersIdListByUserERC721[i] = parseInt(
            availableSellOrdersIdListByUser.resultERC721[i]
          );
        }

        let allSellOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
          allSellOrdersIdListByNftAddressERC721[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
        }

        let availableSellOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
          availableSellOrdersIdListByNftAddressERC721[i] = parseInt(
            availableSellOrdersIdListByNftAddress[i]
          );
        }

        expect(availableSellOrdersIdListERC721).to.be.not.include(0);
        expect(allSellOrdersIdListByUserERC721).to.be.include(0);
        expect(availableSellOrdersIdListByUserERC721).to.be.not.include(0);
        expect(allSellOrdersIdListByNftAddressERC721).to.be.include(0);
        expect(availableSellOrdersIdListByNftAddressERC721).to.be.not.include(0);
      });

      it('Claim royalty', async () => {
        let amount = parseInt(await vault.getRoyalty(erc721.address, ETH_ADDRESS));

        await vault
          .connect(deployer)
          .claimRoyalty(erc721.address, ETH_ADDRESS, amount / 2, deployer.address);

        expect(parseInt(await vault.getRoyalty(erc721.address, ETH_ADDRESS))).to.be.equal(
          amount / 2
        );
      });

      it('Seller cannot cancelSellOrder cause sellOrder was completed', async () => {
        await expectRevert(
          market.connect(alice).cancelSellOrder('0'),
          ERRORS.SELL_ORDER_NOT_ACTIVE
        );
      });

      it('User cannot buy a sellOrder was completed', async () => {
        await expectRevert(
          market.connect(bob).buy('0', '1', bob.address, '0x', { value: price }),
          ERRORS.SELL_ORDER_NOT_ACTIVE
        );
      });
    });
  });

  describe('Alice createSellOrder (with ERC721 and moma) successfully', async () => {
    let erc721;
    let tokenId = 0;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC721 = await ethers.getContractFactory('TestERC721');
      erc721 = await TestERC721.connect(deployer).deploy('TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(erc721.address, false);
      await nftList.connect(marketAdmin).acceptNFT(erc721.address);

      await erc721.connect(deployer).mint(alice.address, tokenId);
      await erc721.connect(alice).setApprovalForAll(market.address, true);
      await market.connect(alice).createSellOrder(erc721.address, tokenId, '1', price, moma.address);
    });

    it('Check sell order info by getSellOrderById', async () => {
      expect(await sellOrderList.getSellOrderCount()).to.be.equal(1);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(1);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(moma.address);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);

      expect(await erc721.ownerOf(tokenId)).to.be.equal(market.address);

      let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    describe('User calls buy successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await moma.balanceOf(alice.address);
        await moma.connect(deployer).mint(bob.address, price)
        await moma.connect(bob).approve(market.address, price);
        await market.connect(bob).buy('0', '1', bob.address, '0x');
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await moma.balanceOf(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc721.ownerOf(tokenId)).to.be.equal(bob.address);
        expect(await moma.balanceOf(vault.address)).to.be.equal((price * 10) / 1000);
        expect(await moma.balanceOf(vault.address)).to.be.equal((price * 10) / 1000);
        expect(await vault.getMochiFund(moma.address)).to.be.equal(
          (((price * 10) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc721.address, moma.address)).to.be.equal(
          (((price * 10) / 1000) * 20) / 100
        );

        let momaRewardToken = await vault.getRewardToken(moma.address);
        expect(await vault.getRewardTokenBalance(alice.address, momaRewardToken)).to.be.equal(0);
      });

      it('Check sellOrderInfo', async () => {
        let sellOrderInfo = await sellOrderList.getSellOrderById(0);
        expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
        expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
        expect(sellOrderInfo.amount).to.be.equal(1);
        expect(sellOrderInfo.soldAmount).to.be.equal(1);
        expect(sellOrderInfo.seller).to.be.equal(alice.address);
        expect(sellOrderInfo.price).to.be.equal(price);
        expect(sellOrderInfo.token).to.be.equal(moma.address);
        expect(sellOrderInfo.isActive).to.be.equal(false);
        expect(sellOrderInfo.buyers).to.be.include(bob.address);
        expect(sellOrderInfo.buyTimes.length).to.be.equal(1);
        expect(await erc721.ownerOf(tokenId)).to.be.equal(bob.address);

        let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });
    });
  });

  describe('Alice createSellOrder (with ERC1155 and ETH) successfully', async () => {
    let erc1155;
    let tokenId = 0;
    // let amountSell = 10;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC1155 = await ethers.getContractFactory('TestERC1155');
      erc1155 = await TestERC1155.connect(deployer).deploy('TestERC1155');

      await nftList.connect(deployer).registerNFT(erc1155.address, true);
      await nftList.connect(marketAdmin).acceptNFT(erc1155.address);

      await erc1155.connect(deployer).mint(alice.address, tokenId, '10', '0x');
      await erc1155.connect(alice).setApprovalForAll(market.address, true);
      await market.connect(alice).createSellOrder(erc1155.address, tokenId, '10', price, ETH_ADDRESS);
    });

    it('Check sell order info by getSellOrderById', async () => {
      expect(await sellOrderList.getSellOrderCount()).to.be.equal(1);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.nftAddress).to.be.equal(erc1155.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(10);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(ETH_ADDRESS);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);

      expect(await erc1155.balanceOf(market.address, tokenId)).to.be.equal(10);

      let latestId = await sellOrderList.getLatestSellIdERC1155(alice.address, erc1155.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('Check sell order info by getSellOrdersByIdList', async () => {
      let result = await sellOrderList.getSellOrdersByIdList([0]);
      let sellOrderInfo = result[0];

      expect(sellOrderInfo.nftAddress).to.be.equal(erc1155.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(10);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(ETH_ADDRESS);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);
    });

    it('Check sellOrder Id is storaged in arrays', async () => {
      let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
      let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
        alice.address
      );
      let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
        alice.address
      );
      let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
        erc1155.address
      );
      let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
        erc1155.address
      );

      let availableSellOrdersIdListERC1155 = [];
      for (let i = 0; i < availableSellOrdersIdList.resultERC1155.length; i++) {
        availableSellOrdersIdListERC1155[i] = parseInt(availableSellOrdersIdList.resultERC1155[i]);
      }

      let allSellOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
        allSellOrdersIdListByUserERC1155[i] = parseInt(allSellOrdersIdListByUser[i]);
      }

      let availableSellOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < availableSellOrdersIdListByUser.resultERC1155.length; i++) {
        availableSellOrdersIdListByUserERC1155[i] = parseInt(
          availableSellOrdersIdListByUser.resultERC1155[i]
        );
      }

      let allSellOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
        allSellOrdersIdListByNftAddressERC1155[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
      }

      let availableSellOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
        availableSellOrdersIdListByNftAddressERC1155[i] = parseInt(
          availableSellOrdersIdListByNftAddress[i]
        );
      }

      expect(availableSellOrdersIdListERC1155).to.be.include(0);
      expect(allSellOrdersIdListByUserERC1155).to.be.include(0);
      expect(availableSellOrdersIdListByUserERC1155).to.be.include(0);
      expect(allSellOrdersIdListByNftAddressERC1155).to.be.include(0);
      expect(availableSellOrdersIdListByNftAddressERC1155).to.be.include(0);
    });

    it('User who is not seller calls cancelSellOrder fail', async () => {
      await expectRevert(market.connect(bob).cancelSellOrder(0), ERRORS.CALLER_NOT_SELLER);
    });

    it('Seller calls cancelSellOrder successfully', async () => {
      await market.connect(alice).cancelSellOrder(0);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.isActive).to.be.equal(false);

      let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
      let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
        alice.address
      );
      let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
        alice.address
      );
      let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
        erc1155.address
      );
      let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
        erc1155.address
      );

      let availableSellOrdersIdListERC1155 = [];
      for (let i = 0; i < availableSellOrdersIdList.resultERC1155.length; i++) {
        availableSellOrdersIdListERC1155[i] = parseInt(availableSellOrdersIdList.resultERC1155[i]);
      }

      let allSellOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
        allSellOrdersIdListByUserERC1155[i] = parseInt(allSellOrdersIdListByUser[i]);
      }

      let availableSellOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < availableSellOrdersIdListByUser.resultERC1155.length; i++) {
        availableSellOrdersIdListByUserERC1155[i] = parseInt(
          availableSellOrdersIdListByUser.resultERC1155[i]
        );
      }

      let allSellOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
        allSellOrdersIdListByNftAddressERC1155[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
      }

      let availableSellOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
        availableSellOrdersIdListByNftAddressERC1155[i] = parseInt(
          availableSellOrdersIdListByNftAddress[i]
        );
      }

      expect(availableSellOrdersIdListERC1155).to.be.not.include(0);
      expect(allSellOrdersIdListByUserERC1155).to.be.include(0);
      expect(availableSellOrdersIdListByUserERC1155).to.be.not.include(0);
      expect(allSellOrdersIdListByNftAddressERC1155).to.be.include(0);
      expect(availableSellOrdersIdListByNftAddressERC1155).to.be.not.include(0);

      let latestId = await sellOrderList.getLatestSellIdERC1155(alice.address, erc1155.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('User calls cancelSellOrder fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancelSellOrder(0);
      await expectRevert(market.connect(alice).cancelSellOrder(0), ERRORS.SELL_ORDER_NOT_ACTIVE);
    });

    it('User who is not seller calls updatePrice fail', async () => {
      await expectRevert(market.connect(bob).updatePrice(0, '1000'), ERRORS.CALLER_NOT_SELLER);
    });

    it('User calls updatePrice fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancelSellOrder(0);
      await expectRevert(
        market.connect(alice).updatePrice(0, '1000'),
        ERRORS.SELL_ORDER_NOT_ACTIVE
      );
    });

    it('User calls updatePrice fail cause newPrice equal oldPrice', async () => {
      await expectRevert(market.connect(alice).updatePrice(0, '1000000'), ERRORS.PRICE_NOT_CHANGE);
    });

    it('User calls updatePrice successfully', async () => {
      await market.connect(alice).updatePrice(0, '2000000');

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.price).to.be.equal('2000000');
    });

    it('User calls buy fail cause he is seller', async () => {
      await expectRevert(
        market.connect(alice).buy('0', '1', alice.address, '0x'),
        ERRORS.CALLER_IS_SELLER
      );
    });

    it('User calls buy fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancelSellOrder(0);
      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x'),
        ERRORS.SELL_ORDER_NOT_ACTIVE
      );
    });

    it('User calls buy fail cause amount wants to buy is zero', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '0', bob.address, '0x'),
        ERRORS.AMOUNT_IS_ZERO
      );
    });

    it('User calls buy fail cause amount is not enough', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '11', bob.address, '0x'),
        ERRORS.AMOUNT_IS_NOT_ENOUGH
      );
    });

    it('User calls buy fail cause msg.value is not equal price', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price - 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );

      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price + 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
    });

    describe('User calls buy successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await ethers.provider.getBalance(alice.address);

        await market.connect(bob).buy('0', '2', bob.address, '0x', { value: 2 * price });
        await market.connect(bob).buy('0', '3', bob.address, '0x', { value: 3 * price });
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await ethers.provider.getBalance(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc1155.balanceOf(bob.address, tokenId)).to.be.equal(5);
        expect(await erc1155.balanceOf(market.address, tokenId)).to.be.equal(5);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((5 * price * 25) / 1000);
        expect(await vault.getMochiFund(ETH_ADDRESS)).to.be.equal(
          (((5 * price * 25) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc1155.address, ETH_ADDRESS)).to.be.equal(
          (((5 * price * 25) / 1000) * 20) / 100
        );

        let ethRewardToken = await vault.getRewardToken(ETH_ADDRESS);
        expect(await vault.getRewardTokenBalance(alice.address, ethRewardToken)).to.be.equal(0);
      });

      it('Check sellOrderInfo', async () => {
        let sellOrderInfo = await sellOrderList.getSellOrderById(0);
        expect(sellOrderInfo.nftAddress).to.be.equal(erc1155.address);
        expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
        expect(sellOrderInfo.amount).to.be.equal(10);
        expect(sellOrderInfo.soldAmount).to.be.equal(5);
        expect(sellOrderInfo.seller).to.be.equal(alice.address);
        expect(sellOrderInfo.price).to.be.equal(price);
        expect(sellOrderInfo.token).to.be.equal(ETH_ADDRESS);
        expect(sellOrderInfo.isActive).to.be.equal(true);
        expect(sellOrderInfo.buyers).to.be.include(bob.address);
        expect(sellOrderInfo.buyTimes.length).to.be.equal(2);

        let latestId = await sellOrderList.getLatestSellIdERC1155(alice.address, erc1155.address, tokenId);
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });


      it('Check arrays', async () => {
        let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
        let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
          alice.address
        );
        let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
          alice.address
        );
        let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
          erc1155.address
        );
        let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
          erc1155.address
        );

        let availableSellOrdersIdListERC1155 = [];
        for (let i = 0; i < availableSellOrdersIdList.resultERC1155.length; i++) {
          availableSellOrdersIdListERC1155[i] = parseInt(availableSellOrdersIdList.resultERC1155[i]);
        }

        let allSellOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
          allSellOrdersIdListByUserERC1155[i] = parseInt(allSellOrdersIdListByUser[i]);
        }

        let availableSellOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < availableSellOrdersIdListByUser.resultERC1155.length; i++) {
          availableSellOrdersIdListByUserERC1155[i] = parseInt(
            availableSellOrdersIdListByUser.resultERC1155[i]
          );
        }

        let allSellOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
          allSellOrdersIdListByNftAddressERC1155[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
        }

        let availableSellOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
          availableSellOrdersIdListByNftAddressERC1155[i] = parseInt(
            availableSellOrdersIdListByNftAddress[i]
          );
        }

        expect(availableSellOrdersIdListERC1155).to.be.include(0);
        expect(allSellOrdersIdListByUserERC1155).to.be.include(0);
        expect(availableSellOrdersIdListByUserERC1155).to.be.include(0);
        expect(allSellOrdersIdListByNftAddressERC1155).to.be.include(0);
        expect(availableSellOrdersIdListByNftAddressERC1155).to.be.include(0);
      });

      it('Cancle sellOrderInfo', async () => {
        await market.connect(alice).cancelSellOrder(0);
        expect(await erc1155.balanceOf(bob.address, tokenId)).to.be.equal(5);
        expect(await erc1155.balanceOf(alice.address, tokenId)).to.be.equal(5);
        expect(await erc1155.balanceOf(market.address, tokenId)).to.be.equal(0);

        let sellOrderInfo = await sellOrderList.getSellOrderById(0);
        expect(sellOrderInfo.isActive).to.be.equal(false);

        let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
        let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
          alice.address
        );
        let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
          alice.address
        );
        let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
          erc1155.address
        );
        let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
          erc1155.address
        );

        let availableSellOrdersIdListERC1155 = [];
        for (let i = 0; i < availableSellOrdersIdList.resultERC1155.length; i++) {
          availableSellOrdersIdListERC1155[i] = parseInt(availableSellOrdersIdList.resultERC1155[i]);
        }

        let allSellOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
          allSellOrdersIdListByUserERC1155[i] = parseInt(allSellOrdersIdListByUser[i]);
        }

        let availableSellOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < availableSellOrdersIdListByUser.resultERC1155.length; i++) {
          availableSellOrdersIdListByUserERC1155[i] = parseInt(
            availableSellOrdersIdListByUser.resultERC1155[i]
          );
        }

        let allSellOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
          allSellOrdersIdListByNftAddressERC1155[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
        }

        let availableSellOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
          availableSellOrdersIdListByNftAddressERC1155[i] = parseInt(
            availableSellOrdersIdListByNftAddress[i]
          );
        }

        expect(availableSellOrdersIdListERC1155).to.be.not.include(0);
        expect(allSellOrdersIdListByUserERC1155).to.be.include(0);
        expect(availableSellOrdersIdListByUserERC1155).to.be.not.include(0);
        expect(allSellOrdersIdListByNftAddressERC1155).to.be.include(0);
        expect(availableSellOrdersIdListByNftAddressERC1155).to.be.not.include(0);

      });

      it('Claim royalty', async () => {
        let amount = parseInt(await vault.getRoyalty(erc1155.address, ETH_ADDRESS));

        await vault
          .connect(deployer)
          .claimRoyalty(erc1155.address, ETH_ADDRESS, amount / 2, deployer.address);

        expect(parseInt(await vault.getRoyalty(erc1155.address, ETH_ADDRESS))).to.be.equal(
          amount / 2
        );
      });

      it('Seller cannot cancelSellOrder cause sellOrder was completed', async () => {
        await market.connect(bob).buy('0', '5', bob.address, '0x', { value: 5 * price });

        expect(await erc1155.balanceOf(bob.address, tokenId)).to.be.equal(10);
        expect(await erc1155.balanceOf(market.address, tokenId)).to.be.equal(0);

        await expectRevert(
          market.connect(alice).cancelSellOrder('0'),
          ERRORS.SELL_ORDER_NOT_ACTIVE
        );
      });

      it('User cannot buy a sellOrder was completed', async () => {
        await market.connect(bob).buy('0', '5', bob.address, '0x', { value: 5 * price });
        await expectRevert(
          market.connect(bob).buy('0', '1', bob.address, '0x', { value: price }),
          ERRORS.SELL_ORDER_NOT_ACTIVE
        );
      });
    });
  });

  describe('Alice createSellOrder (with ERC1155 and ETH) successfully', async () => {
    let erc1155;
    let tokenId = 0;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC1155 = await ethers.getContractFactory('TestERC1155');
      erc1155 = await TestERC1155.connect(deployer).deploy('TestERC1155');

      await nftList.connect(deployer).registerNFT(erc1155.address, true);
      await nftList.connect(marketAdmin).acceptNFT(erc1155.address);

      await erc1155.connect(deployer).mint(alice.address, tokenId, '10', '0x');
      await erc1155.connect(alice).setApprovalForAll(market.address, true);
      await market.connect(alice).createSellOrder(erc1155.address, tokenId, '10', price, moma.address);
    });

    it('Check sell order info by getSellOrderById', async () => {
      expect(await sellOrderList.getSellOrderCount()).to.be.equal(1);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.nftAddress).to.be.equal(erc1155.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(10);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(moma.address);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);

      expect(await erc1155.balanceOf(market.address, tokenId)).to.be.equal(10);

      let latestId = await sellOrderList.getLatestSellIdERC1155(alice.address, erc1155.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    describe('User calls buy successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await moma.balanceOf(alice.address);
        await moma.connect(deployer).mint(bob.address, 5 * price);
        await moma.connect(bob).approve(market.address, 5 * price);

        await market.connect(bob).buy('0', '2', bob.address, '0x');
        await market.connect(bob).buy('0', '3', bob.address, '0x');
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await moma.balanceOf(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc1155.balanceOf(bob.address, tokenId)).to.be.equal(5);
        expect(await erc1155.balanceOf(market.address, tokenId)).to.be.equal(5);
        expect(await moma.balanceOf(vault.address)).to.be.equal((5 * price * 10) / 1000);
        expect(await vault.getMochiFund(moma.address)).to.be.equal(
          (((5 * price * 10) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc1155.address, moma.address)).to.be.equal(
          (((5 * price * 10) / 1000) * 20) / 100
        );

        let momaRewardToken = await vault.getRewardToken(moma.address);
        expect(await vault.getRewardTokenBalance(alice.address, momaRewardToken)).to.be.equal(0);
      });

      it('Check sellOrderInfo', async () => {
        let sellOrderInfo = await sellOrderList.getSellOrderById(0);
        expect(sellOrderInfo.nftAddress).to.be.equal(erc1155.address);
        expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
        expect(sellOrderInfo.amount).to.be.equal(10);
        expect(sellOrderInfo.soldAmount).to.be.equal(5);
        expect(sellOrderInfo.seller).to.be.equal(alice.address);
        expect(sellOrderInfo.price).to.be.equal(price);
        expect(sellOrderInfo.token).to.be.equal(moma.address);
        expect(sellOrderInfo.isActive).to.be.equal(true);
        expect(sellOrderInfo.buyers).to.be.include(bob.address);
        expect(sellOrderInfo.buyTimes.length).to.be.equal(2);

        let latestId = await sellOrderList.getLatestSellIdERC1155(alice.address, erc1155.address, tokenId);
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });
    });
  });

  describe('Alice createExchangeOrder (ERC721 <-> ERC721) successfully', async () => {
    let erc721A;
    let erc721B;
    let souTokenId = 0;
    let desTokenId = 0;
    let desAmount = 1;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC721 = await ethers.getContractFactory('TestERC721');
      erc721A = await TestERC721.connect(deployer).deploy('TestERC721A', 'TestERC721A');

      await nftList.connect(deployer).registerNFT(erc721A.address, false);
      await nftList.connect(marketAdmin).acceptNFT(erc721A.address);
      await erc721A.connect(deployer).mint(alice.address, souTokenId);
      await erc721A.connect(alice).setApprovalForAll(market.address, true);


      erc721B = await TestERC721.connect(deployer).deploy('TestERC721B', 'TestERC721B');

      await nftList.connect(deployer).registerNFT(erc721B.address, false);
      await nftList.connect(marketAdmin).acceptNFT(erc721B.address);
      await erc721B.connect(deployer).mint(bob.address, desTokenId);
      await erc721B.connect(bob).setApprovalForAll(market.address, true);

      await market
        .connect(alice)
        .createExchangeOrder(
          [erc721A.address, erc721B.address],
          [souTokenId, desTokenId],
          [1, desAmount],
          [ETH_ADDRESS, ETH_ADDRESS],
          [0, price],
          [alice.address],
          ['0x', '0x']
        );
    });

    it('Check sell order info by getExchangeOrderById', async () => {
      expect(await exchangeOrderList.getExchangeOrderCount()).to.be.equal(1);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc721A.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc721B.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(1);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(1);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);

      expect(await erc721A.ownerOf(souTokenId)).to.be.equal(market.address);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC721(erc721A.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('Check sell order info by getExchangeOrdersByIdList', async () => {
      let result = await exchangeOrderList.getExchangeOrdersByIdList([0]);
      let exchangeOrderInfo = result[0];

      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc721A.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc721B.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(1);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(1);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
    });

    it('Check exchangeOrder Id is storaged in arrays', async () => {
      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc721A.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc721A.address
      );

      let availableExchangeOrdersIdListERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC721.length; i++) {
        availableExchangeOrdersIdListERC721[i] = parseInt(
          availableExchangeOrdersIdList.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC721[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC721.length; i++) {
        availableExchangeOrdersIdListByUserERC721[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdListERC721).to.be.include(0);
      expect(allExchangeOrdersIdListByUserERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC721).to.be.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
    });

    it('User who is not seller calls cancelExchangeOrder fail', async () => {
      await expectRevert(market.connect(bob).cancelExchangeOrder(0), ERRORS.CALLER_NOT_SELLER);
    });

    it('Seller calls cancelExchangeOrder successfully', async () => {
      await market.connect(alice).cancelExchangeOrder(0);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.isActive).to.be.equal(false);

      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc721A.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc721A.address
      );

      let availableExchangeOrdersIdListERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC721.length; i++) {
        availableExchangeOrdersIdListERC721[i] = parseInt(
          availableExchangeOrdersIdList.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC721[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC721.length; i++) {
        availableExchangeOrdersIdListByUserERC721[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdListERC721).to.be.not.include(0);
      expect(allExchangeOrdersIdListByUserERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC721).to.be.not.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC721).to.be.not.include(0);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC721(erc721A.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('User calls cancelExchangeOrder fail cause exchnageOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(alice).cancelExchangeOrder(0),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause he is seller', async () => {
      await expectRevert(
        market.connect(alice.address).exchange('0', '1', alice.address, '0x'),
        ERRORS.CALLER_IS_SELLER
      );
    });

    it('User calls exchange fail cause exchangelOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x'),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause msg.value is not equal price', async () => {
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price - 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price + 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
    });

    describe('User calls exchange successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await ethers.provider.getBalance(alice.address);
        await market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price });
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await ethers.provider.getBalance(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc721A.ownerOf(souTokenId)).to.be.equal(bob.address);
        expect(await erc721B.ownerOf(desTokenId)).to.be.equal(alice.address);

        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await vault.getMochiFund(ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc721A.address, ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 20) / 100
        );

        let ethRewardToken = await vault.getRewardToken(ETH_ADDRESS);
        expect(await vault.getRewardTokenBalance(alice.address, ethRewardToken)).to.be.equal(0);
      });

      it('Check exchangeOrderInfo', async () => {
        let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
        expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc721A.address);
        expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc721B.address);

        expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
        expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

        expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(1);
        expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(1);

        expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
        expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

        expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
        expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
        expect(exchangeOrderInfo.isActive).to.be.equal(false);
        expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
        expect(exchangeOrderInfo.users[1]).to.be.equal(bob.address);

        expect(await erc721A.ownerOf(souTokenId)).to.be.equal(bob.address);
        expect(await erc721B.ownerOf(desTokenId)).to.be.equal(alice.address);


        let latestId = await exchangeOrderList.getLatestExchangeIdERC721(
          erc721A.address,
          souTokenId
        );
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });

      it('Check arrays', async () => {
        let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
        let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
          alice.address
        );
        let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
          alice.address
        );
        let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
          erc721A.address
        );
        let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
          erc721A.address
        );

        let availableExchangeOrdersIdListERC721 = [];
        for (let i = 0; i < availableExchangeOrdersIdList.resultERC721.length; i++) {
          availableExchangeOrdersIdListERC721[i] = parseInt(
            availableExchangeOrdersIdList.resultERC721[i]
          );
        }

        let allExchangeOrdersIdListByUserERC721 = [];
        for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
          allExchangeOrdersIdListByUserERC721[i] = parseInt(allExchangeOrdersIdListByUser[i]);
        }

        let availableExchangeOrdersIdListByUserERC721 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC721.length; i++) {
          availableExchangeOrdersIdListByUserERC721[i] = parseInt(
            availableExchangeOrdersIdListByUser.resultERC721[i]
          );
        }

        let allExchangeOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
          allExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
            allExchangeOrdersIdListByNftAddress[i]
          );
        }

        let availableExchangeOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
          availableExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
            availableExchangeOrdersIdListByNftAddress[i]
          );
        }

        expect(availableExchangeOrdersIdListERC721).to.be.not.include(0);
        expect(allExchangeOrdersIdListByUserERC721).to.be.include(0);
        expect(availableExchangeOrdersIdListByUserERC721).to.be.not.include(0);
        expect(allExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
        expect(availableExchangeOrdersIdListByNftAddressERC721).to.be.not.include(0);
      });

      it('Claim royalty', async () => {
        let amount = parseInt(await vault.getRoyalty(erc721A.address, ETH_ADDRESS));

        await vault
          .connect(deployer)
          .claimRoyalty(erc721A.address, ETH_ADDRESS, amount / 2, deployer.address);

        expect(parseInt(await vault.getRoyalty(erc721A.address, ETH_ADDRESS))).to.be.equal(
          amount / 2
        );
      });

      it('Seller cannot cancelExchangeOrder cause exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(alice).cancelExchangeOrder('0'),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });

      it('User cannot buy a exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price }),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });
    });
  });

  describe('Alice createExchangeOrder (ERC721 <-> ERC1155) successfully', async () => {
    let erc721;
    let erc1155;
    let souTokenId = 0;
    let desTokenId = 0;
    let desAmount = 5;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC721 = await ethers.getContractFactory('TestERC721');
      erc721 = await TestERC721.connect(deployer).deploy('TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(erc721.address, false);
      await nftList.connect(marketAdmin).acceptNFT(erc721.address);
      await erc721.connect(deployer).mint(alice.address, souTokenId);
      await erc721.connect(alice).setApprovalForAll(market.address, true);

      let TestERC1155 = await ethers.getContractFactory('TestERC1155');
      erc1155 = await TestERC1155.connect(deployer).deploy('Test ERC1155');

      await nftList.connect(deployer).registerNFT(erc1155.address, true);
      await nftList.connect(marketAdmin).acceptNFT(erc1155.address);
      await erc1155.connect(deployer).mint(bob.address, desTokenId, desAmount, '0x');
      await erc1155.connect(bob).setApprovalForAll(market.address, true);

      await market
        .connect(alice)
        .createExchangeOrder(
          [erc721.address, erc1155.address],
          [souTokenId, desTokenId],
          [1, desAmount],
          [ETH_ADDRESS, ETH_ADDRESS],
          [0, price],
          [alice.address],
          ['0x', '0x']
        );
    });

    it('Check sell order info by getExchangeOrderById', async () => {
      expect(await exchangeOrderList.getExchangeOrderCount()).to.be.equal(1);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc721.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc1155.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(1);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(desAmount);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);

      expect(await erc721.ownerOf(souTokenId)).to.be.equal(market.address);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC721(erc721.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('Check sell order info by getExchangeOrdersByIdList', async () => {
      let result = await exchangeOrderList.getExchangeOrdersByIdList([0]);
      let exchangeOrderInfo = result[0];

      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc721.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc1155.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(1);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(desAmount);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
    });

    it('Check exchangeOrder Id is storaged in arrays', async () => {
      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc721.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc721.address
      );

      let availableExchangeOrdersIdListERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC721.length; i++) {
        availableExchangeOrdersIdListERC721[i] = parseInt(
          availableExchangeOrdersIdList.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC721[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC721.length; i++) {
        availableExchangeOrdersIdListByUserERC721[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdListERC721).to.be.include(0);
      expect(allExchangeOrdersIdListByUserERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC721).to.be.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
    });

    it('User who is not seller calls cancelExchangeOrder fail', async () => {
      await expectRevert(market.connect(bob).cancelExchangeOrder(0), ERRORS.CALLER_NOT_SELLER);
    });

    it('Seller calls cancelExchangeOrder successfully', async () => {
      await market.connect(alice).cancelExchangeOrder(0);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.isActive).to.be.equal(false);

      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc721.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc721.address
      );

      let availableExchangeOrdersIdListERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC721.length; i++) {
        availableExchangeOrdersIdListERC721[i] = parseInt(
          availableExchangeOrdersIdList.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC721[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC721.length; i++) {
        availableExchangeOrdersIdListByUserERC721[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC721[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdList.resultERC721).to.be.not.include(0);
      expect(allExchangeOrdersIdListByUserERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC721).to.be.not.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC721).to.be.not.include(0);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC721(erc721.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('User calls cancelExchangeOrder fail cause exchnageOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(alice).cancelExchangeOrder(0),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause he is seller', async () => {
      await expectRevert(
        market.connect(alice.address).exchange('0', '1', alice.address, '0x'),
        ERRORS.CALLER_IS_SELLER
      );
    });

    it('User calls exchange fail cause exchangelOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x'),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause msg.value is not equal price', async () => {
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price - 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price + 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
    });

    describe('User calls exchange successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await ethers.provider.getBalance(alice.address);
        await market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price });
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await ethers.provider.getBalance(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc721.ownerOf(souTokenId)).to.be.equal(bob.address);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await vault.getMochiFund(ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc721.address, ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 20) / 100
        );

        let ethRewardToken = await vault.getRewardToken(ETH_ADDRESS);
        expect(await vault.getRewardTokenBalance(alice.address, ethRewardToken)).to.be.equal(0);
      });

      it('Check exchangeOrderInfo', async () => {
        let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
        expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc721.address);
        expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc1155.address);

        expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
        expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

        expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(1);
        expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(desAmount);

        expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
        expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

        expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
        expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
        expect(exchangeOrderInfo.isActive).to.be.equal(false);
        expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
        expect(exchangeOrderInfo.users[1]).to.be.equal(bob.address);

        expect(await erc721.ownerOf(souTokenId)).to.be.equal(bob.address);
        expect(parseInt(await erc1155.balanceOf(alice.address, desTokenId))).to.be.equal(desAmount);
        expect(parseInt(await erc1155.balanceOf(bob.address, desTokenId))).to.be.equal(0);

        let latestId = await exchangeOrderList.getLatestExchangeIdERC721(
          erc721.address,
          souTokenId
        );
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });

      it('Check arrays', async () => {
        let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
        let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
          alice.address
        );
        let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
          alice.address
        );
        let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
          erc721.address
        );
        let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
          erc721.address
        );

        let availableExchangeOrdersIdListERC721 = [];
        for (let i = 0; i < availableExchangeOrdersIdList.resultERC721.length; i++) {
          availableExchangeOrdersIdListERC721[i] = parseInt(
            availableExchangeOrdersIdList.resultERC721[i]
          );
        }

        let allExchangeOrdersIdListByUserERC721 = [];
        for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
          allExchangeOrdersIdListByUserERC721[i] = parseInt(allExchangeOrdersIdListByUser[i]);
        }

        let availableExchangeOrdersIdListByUserERC721 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC721.length; i++) {
          availableExchangeOrdersIdListByUserERC721[i] = parseInt(
            availableExchangeOrdersIdListByUser.resultERC721[i]
          );
        }

        let allExchangeOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
          allExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
            allExchangeOrdersIdListByNftAddress[i]
          );
        }

        let availableExchangeOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
          availableExchangeOrdersIdListByNftAddressERC721[i] = parseInt(
            availableExchangeOrdersIdListByNftAddress[i]
          );
        }

        expect(availableExchangeOrdersIdList.resultERC721).to.be.not.include(0);
        expect(allExchangeOrdersIdListByUserERC721).to.be.include(0);
        expect(availableExchangeOrdersIdListByUserERC721).to.be.not.include(0);
        expect(allExchangeOrdersIdListByNftAddressERC721).to.be.include(0);
        expect(availableExchangeOrdersIdListByNftAddressERC721).to.be.not.include(0);
      });

      it('Claim royalty', async () => {
        let amount = parseInt(await vault.getRoyalty(erc721.address, ETH_ADDRESS));

        await vault
          .connect(deployer)
          .claimRoyalty(erc721.address, ETH_ADDRESS, amount / 2, deployer.address);

        expect(parseInt(await vault.getRoyalty(erc721.address, ETH_ADDRESS))).to.be.equal(
          amount / 2
        );
      });

      it('Seller cannot cancelExchangeOrder cause exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(alice).cancelExchangeOrder('0'),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });

      it('User cannot buy a exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price }),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });
    });
  });

  describe('Alice createExchangeOrder (ERC1155 <-> ERC721) successfully', async () => {
    let erc721;
    let erc1155;
    let souTokenId = 0;
    let desTokenId = 0;
    let desAmount = 1;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC1155 = await ethers.getContractFactory('TestERC1155');
      erc1155 = await TestERC1155.connect(deployer).deploy('Test ERC1155');

      await nftList.connect(deployer).registerNFT(erc1155.address, true);
      await nftList.connect(marketAdmin).acceptNFT(erc1155.address);
      await erc1155.connect(deployer).mint(alice.address, souTokenId, 5, '0x');
      await erc1155.connect(alice).setApprovalForAll(market.address, true);

      let TestERC721 = await ethers.getContractFactory('TestERC721');
      erc721 = await TestERC721.connect(deployer).deploy('TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(erc721.address, false);
      await nftList.connect(marketAdmin).acceptNFT(erc721.address);
      await erc721.connect(deployer).mint(bob.address, desTokenId);
      await erc721.connect(bob).setApprovalForAll(market.address, true);

      await market
        .connect(alice)
        .createExchangeOrder(
          [erc1155.address, erc721.address],
          [souTokenId, desTokenId],
          [3, 1],
          [ETH_ADDRESS, ETH_ADDRESS],
          [0, price],
          [alice.address],
          ['0x', '0x']
        );
    });

    it('Check sell order info by getExchangeOrderById', async () => {
      expect(await exchangeOrderList.getExchangeOrderCount()).to.be.equal(1);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc1155.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc721.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(3);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(1);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);

      expect(await erc1155.balanceOf(market.address, souTokenId)).to.be.equal(3);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC1155(alice.address, erc1155.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('Check sell order info by getExchangeOrdersByIdList', async () => {
      let result = await exchangeOrderList.getExchangeOrdersByIdList([0]);
      let exchangeOrderInfo = result[0];

      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc1155.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc721.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(3);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(1);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
    });

    it('Check exchangeOrder Id is storaged in arrays', async () => {
      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc1155.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc1155.address
      );

      let availableExchangeOrdersIdListERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC1155.length; i++) {
        availableExchangeOrdersIdListERC1155[i] = parseInt(
          availableExchangeOrdersIdList.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC1155[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC1155.length; i++) {
        availableExchangeOrdersIdListByUserERC1155[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdListERC1155).to.be.include(0);
      expect(allExchangeOrdersIdListByUserERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC1155).to.be.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
    });

    it('User who is not seller calls cancelExchangeOrder fail', async () => {
      await expectRevert(market.connect(bob).cancelExchangeOrder(0), ERRORS.CALLER_NOT_SELLER);
    });

    it('Seller calls cancelExchangeOrder successfully', async () => {
      await market.connect(alice).cancelExchangeOrder(0);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.isActive).to.be.equal(false);

      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc1155.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc1155.address
      );

      let availableExchangeOrdersIdListERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC1155.length; i++) {
        availableExchangeOrdersIdListERC1155[i] = parseInt(
          availableExchangeOrdersIdList.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC1155[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC1155.length; i++) {
        availableExchangeOrdersIdListByUserERC1155[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdListERC1155).to.be.not.include(0);
      expect(allExchangeOrdersIdListByUserERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC1155).to.be.not.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC1155).to.be.not.include(0);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC1155(alice.address, erc1155.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('User calls cancelExchangeOrder fail cause exchnageOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(alice).cancelExchangeOrder(0),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause he is seller', async () => {
      await expectRevert(
        market.connect(alice.address).exchange('0', '1', alice.address, '0x'),
        ERRORS.CALLER_IS_SELLER
      );
    });

    it('User calls exchange fail cause exchangelOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x'),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause msg.value is not equal price', async () => {
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price - 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price + 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
    });

    describe('User calls exchange successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await ethers.provider.getBalance(alice.address);
        await market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price });
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await ethers.provider.getBalance(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc721.ownerOf(desTokenId)).to.be.equal(alice.address);
        expect(await erc1155.balanceOf(alice.address, souTokenId)).to.be.equal(2);
        expect(await erc1155.balanceOf(bob.address, souTokenId)).to.be.equal(3);

        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await vault.getMochiFund(ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc1155.address, ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 20) / 100
        );

        let ethRewardToken = await vault.getRewardToken(ETH_ADDRESS);
        expect(await vault.getRewardTokenBalance(alice.address, ethRewardToken)).to.be.equal(0);
      });

      it('Check exchangeOrderInfo', async () => {
        let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
        expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc1155.address);
        expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc721.address);

        expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
        expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

        expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(3);
        expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(1);

        expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
        expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

        expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
        expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
        expect(exchangeOrderInfo.isActive).to.be.equal(false);
        expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
        expect(exchangeOrderInfo.users[1]).to.be.equal(bob.address);

        let latestId = await exchangeOrderList.getLatestExchangeIdERC1155(
          alice.address,
          erc1155.address,
          souTokenId
        );
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });

      it('Check arrays', async () => {
        let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
        let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
          alice.address
        );
        let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
          alice.address
        );
        let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
          erc1155.address
        );
        let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
          erc1155.address
        );

        let availableExchangeOrdersIdListERC1155 = [];
        for (let i = 0; i < availableExchangeOrdersIdList.resultERC1155.length; i++) {
          availableExchangeOrdersIdListERC1155[i] = parseInt(
            availableExchangeOrdersIdList.resultERC1155[i]
          );
        }

        let allExchangeOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
          allExchangeOrdersIdListByUserERC1155[i] = parseInt(allExchangeOrdersIdListByUser[i]);
        }

        let availableExchangeOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC1155.length; i++) {
          availableExchangeOrdersIdListByUserERC1155[i] = parseInt(
            availableExchangeOrdersIdListByUser.resultERC1155[i]
          );
        }

        let allExchangeOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
          allExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
            allExchangeOrdersIdListByNftAddress[i]
          );
        }

        let availableExchangeOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
          availableExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
            availableExchangeOrdersIdListByNftAddress[i]
          );
        }

        expect(availableExchangeOrdersIdListERC1155).to.be.not.include(0);
        expect(allExchangeOrdersIdListByUserERC1155).to.be.include(0);
        expect(availableExchangeOrdersIdListByUserERC1155).to.be.not.include(0);
        expect(allExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
        expect(availableExchangeOrdersIdListByNftAddressERC1155).to.be.not.include(0);
      });

      it('Claim royalty', async () => {
        let amount = parseInt(await vault.getRoyalty(erc1155.address, ETH_ADDRESS));

        await vault
          .connect(deployer)
          .claimRoyalty(erc1155.address, ETH_ADDRESS, amount / 2, deployer.address);

        expect(parseInt(await vault.getRoyalty(erc1155.address, ETH_ADDRESS))).to.be.equal(
          amount / 2
        );
      });

      it('Seller cannot cancelExchangeOrder cause exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(alice).cancelExchangeOrder('0'),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });

      it('User cannot buy a exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price }),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });
    });
  });

  describe('Alice createExchangeOrder (ERC1155 <-> ERC1155) successfully', async () => {
    let erc1155A;
    let erc1155B;
    let souTokenId = 0;
    let desTokenId = 0;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC1155 = await ethers.getContractFactory('TestERC1155');
      erc1155A = await TestERC1155.connect(deployer).deploy('Test ERC1155');

      await nftList.connect(deployer).registerNFT(erc1155A.address, true);
      await nftList.connect(marketAdmin).acceptNFT(erc1155A.address);
      await erc1155A.connect(deployer).mint(alice.address, souTokenId, 10, '0x');
      await erc1155A.connect(alice).setApprovalForAll(market.address, true);

      erc1155B = await TestERC1155.connect(deployer).deploy('Test ERC1155');

      await nftList.connect(deployer).registerNFT(erc1155B.address, true);
      await nftList.connect(marketAdmin).acceptNFT(erc1155B.address);
      await erc1155B.connect(deployer).mint(bob.address, desTokenId, 10, '0x');
      await erc1155B.connect(bob).setApprovalForAll(market.address, true);

      await market
        .connect(alice)
        .createExchangeOrder(
          [erc1155A.address, erc1155B.address],
          [souTokenId, desTokenId],
          [3, 4],
          [ETH_ADDRESS, ETH_ADDRESS],
          [0, price],
          [alice.address],
          ['0x', '0x']
        );
    });

    it('Check sell order info by getExchangeOrderById', async () => {
      expect(await exchangeOrderList.getExchangeOrderCount()).to.be.equal(1);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc1155A.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc1155B.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(3);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(4);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);

      expect(await erc1155A.balanceOf(market.address, souTokenId)).to.be.equal(3);
      expect(await erc1155A.balanceOf(alice.address, souTokenId)).to.be.equal(7);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC1155(alice.address, erc1155A.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('Check sell order info by getExchangeOrdersByIdList', async () => {
      let result = await exchangeOrderList.getExchangeOrdersByIdList([0]);
      let exchangeOrderInfo = result[0];

      expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc1155A.address);
      expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc1155B.address);

      expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
      expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

      expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(3);
      expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(4);

      expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
      expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

      expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
      expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
      expect(exchangeOrderInfo.isActive).to.be.equal(true);
      expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
    });

    it('Check exchangeOrder Id is storaged in arrays', async () => {
      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc1155A.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc1155A.address
      );

      let availableExchangeOrdersIdListERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC1155.length; i++) {
        availableExchangeOrdersIdListERC1155[i] = parseInt(
          availableExchangeOrdersIdList.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC1155[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC1155.length; i++) {
        availableExchangeOrdersIdListByUserERC1155[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdListERC1155).to.be.include(0);
      expect(allExchangeOrdersIdListByUserERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC1155).to.be.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
    });

    it('User who is not seller calls cancelExchangeOrder fail', async () => {
      await expectRevert(market.connect(bob).cancelExchangeOrder(0), ERRORS.CALLER_NOT_SELLER);
    });

    it('Seller calls cancelExchangeOrder successfully', async () => {
      await market.connect(alice).cancelExchangeOrder(0);

      let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
      expect(exchangeOrderInfo.isActive).to.be.equal(false);

      let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
      let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
        alice.address
      );
      let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
        alice.address
      );
      let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
        erc1155A.address
      );
      let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
        erc1155A.address
      );

      let availableExchangeOrdersIdListERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdList.resultERC1155.length; i++) {
        availableExchangeOrdersIdListERC1155[i] = parseInt(
          availableExchangeOrdersIdList.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
        allExchangeOrdersIdListByUserERC1155[i] = parseInt(allExchangeOrdersIdListByUser[i]);
      }

      let availableExchangeOrdersIdListByUserERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC1155.length; i++) {
        availableExchangeOrdersIdListByUserERC1155[i] = parseInt(
          availableExchangeOrdersIdListByUser.resultERC1155[i]
        );
      }

      let allExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
        allExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          allExchangeOrdersIdListByNftAddress[i]
        );
      }

      let availableExchangeOrdersIdListByNftAddressERC1155 = [];
      for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
        availableExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
          availableExchangeOrdersIdListByNftAddress[i]
        );
      }

      expect(availableExchangeOrdersIdListERC1155).to.be.not.include(0);
      expect(allExchangeOrdersIdListByUserERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByUserERC1155).to.be.not.include(0);
      expect(allExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
      expect(availableExchangeOrdersIdListByNftAddressERC1155).to.be.not.include(0);

      let latestId = await exchangeOrderList.getLatestExchangeIdERC1155(alice.address, erc1155A.address, souTokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);
    });

    it('User calls cancelExchangeOrder fail cause exchnageOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(alice).cancelExchangeOrder(0),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause he is seller', async () => {
      await expectRevert(
        market.connect(alice.address).exchange('0', '1', alice.address, '0x'),
        ERRORS.CALLER_IS_SELLER
      );
    });

    it('User calls exchange fail cause exchangelOrder is not active', async () => {
      await market.connect(alice).cancelExchangeOrder(0);
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x'),
        ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
      );
    });

    it('User calls exchange fail cause msg.value is not equal price', async () => {
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price - 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
      await expectRevert(
        market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price + 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
    });

    describe('User calls exchange successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await ethers.provider.getBalance(alice.address);
        await market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price });
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await ethers.provider.getBalance(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc1155A.balanceOf(alice.address, souTokenId)).to.be.equal(7);
        expect(await erc1155A.balanceOf(bob.address, souTokenId)).to.be.equal(3);

        expect(await erc1155B.balanceOf(alice.address, souTokenId)).to.be.equal(4);
        expect(await erc1155B.balanceOf(bob.address, souTokenId)).to.be.equal(6);

        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await vault.getMochiFund(ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc1155A.address, ETH_ADDRESS)).to.be.equal(
          (((price * 25) / 1000) * 20) / 100
        );

        let ethRewardToken = await vault.getRewardToken(ETH_ADDRESS);
        expect(await vault.getRewardTokenBalance(alice.address, ethRewardToken)).to.be.equal(0);
      });

      it('Check exchangeOrderInfo', async () => {
        let exchangeOrderInfo = await exchangeOrderList.getExchangeOrderById(0);
        expect(exchangeOrderInfo.nftAddresses[0]).to.be.equal(erc1155A.address);
        expect(exchangeOrderInfo.nftAddresses[1]).to.be.equal(erc1155B.address);

        expect(exchangeOrderInfo.tokenIds[0]).to.be.equal(souTokenId);
        expect(exchangeOrderInfo.tokenIds[1]).to.be.equal(desTokenId);

        expect(exchangeOrderInfo.nftAmounts[0]).to.be.equal(3);
        expect(exchangeOrderInfo.nftAmounts[1]).to.be.equal(4);

        expect(exchangeOrderInfo.tokens[0]).to.be.equal(ETH_ADDRESS);
        expect(exchangeOrderInfo.tokens[1]).to.be.equal(ETH_ADDRESS);

        expect(parseInt(exchangeOrderInfo.prices[0])).to.be.equal(0);
        expect(parseInt(exchangeOrderInfo.prices[1])).to.be.equal(price);
        expect(exchangeOrderInfo.isActive).to.be.equal(false);
        expect(exchangeOrderInfo.users[0]).to.be.equal(alice.address);
        expect(exchangeOrderInfo.users[1]).to.be.equal(bob.address);

        let latestId = await exchangeOrderList.getLatestExchangeIdERC1155(
          alice.address,
          erc1155A.address,
          souTokenId
        );
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);
      });

      it('Check arrays', async () => {
        let availableExchangeOrdersIdList = await exchangeOrderList.getAvailableExchangeOrdersIdList();
        let allExchangeOrdersIdListByUser = await exchangeOrderList.getAllExchangeOrdersIdListByUser(
          alice.address
        );
        let availableExchangeOrdersIdListByUser = await exchangeOrderList.getAvailableExchangeOrdersIdListByUser(
          alice.address
        );
        let allExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAllExchangeOrdersIdListByNftAddress(
          erc1155A.address
        );
        let availableExchangeOrdersIdListByNftAddress = await exchangeOrderList.getAvailableExchangeOrdersIdListByNftAddress(
          erc1155A.address
        );

        let availableExchangeOrdersIdListERC1155 = [];
        for (let i = 0; i < availableExchangeOrdersIdList.resultERC1155.length; i++) {
          availableExchangeOrdersIdListERC1155[i] = parseInt(
            availableExchangeOrdersIdList.resultERC1155[i]
          );
        }

        let allExchangeOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < allExchangeOrdersIdListByUser.length; i++) {
          allExchangeOrdersIdListByUserERC1155[i] = parseInt(allExchangeOrdersIdListByUser[i]);
        }

        let availableExchangeOrdersIdListByUserERC1155 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByUser.resultERC1155.length; i++) {
          availableExchangeOrdersIdListByUserERC1155[i] = parseInt(
            availableExchangeOrdersIdListByUser.resultERC1155[i]
          );
        }

        let allExchangeOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < allExchangeOrdersIdListByNftAddress.length; i++) {
          allExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
            allExchangeOrdersIdListByNftAddress[i]
          );
        }

        let availableExchangeOrdersIdListByNftAddressERC1155 = [];
        for (let i = 0; i < availableExchangeOrdersIdListByNftAddress.length; i++) {
          availableExchangeOrdersIdListByNftAddressERC1155[i] = parseInt(
            availableExchangeOrdersIdListByNftAddress[i]
          );
        }

        expect(availableExchangeOrdersIdListERC1155).to.be.not.include(0);
        expect(allExchangeOrdersIdListByUserERC1155).to.be.include(0);
        expect(availableExchangeOrdersIdListByUserERC1155).to.be.not.include(0);
        expect(allExchangeOrdersIdListByNftAddressERC1155).to.be.include(0);
        expect(availableExchangeOrdersIdListByNftAddressERC1155).to.be.not.include(0);
      });

      it('Claim royalty', async () => {
        let amount = parseInt(await vault.getRoyalty(erc1155A.address, ETH_ADDRESS));

        await vault
          .connect(deployer)
          .claimRoyalty(erc1155A.address, ETH_ADDRESS, amount / 2, deployer.address);

        expect(parseInt(await vault.getRoyalty(erc1155A.address, ETH_ADDRESS))).to.be.equal(
          amount / 2
        );
      });

      it('Seller cannot cancelExchangeOrder cause exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(alice).cancelExchangeOrder('0'),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });

      it('User cannot buy a exchangeOrder was completed', async () => {
        await expectRevert(
          market.connect(bob).exchange('0', '1', bob.address, '0x', { value: price }),
          ERRORS.EXCHANGE_ORDER_NOT_ACTIVE
        );
      });
    });
  });
});
