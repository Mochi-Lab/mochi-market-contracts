/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const {
  deployAddressesProvider,
  allSetup,
  deployTestERC721,
} = require('../helpers');
const { ERRORS, FEE } = require('../constans');

describe('Market', async () => {
  let addressesProvider,
    nftListProxy,
    vaultProxy,
    marketProxy,
    sellOrderListProxy;

  let deployer, marketAdmin, alice, bob;

  let testERC721, nonAccepetedERC721, mochiRewardToken_ETH;
  let tokenId = '1';
  let price = 1000000;
  let ETH_Address = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    [deployer, marketAdmin, alice, bob] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    let result = await allSetup(
      deployer,
      addressesProvider,
      deployer,
      marketAdmin
    );
    addressesProvider = result.addressesProvider;
    nftListProxy = result.nftListProxy;
    vaultProxy = result.vaultProxy;
    marketProxy = result.marketProxy;
    sellOrderListProxy = result.sellOrderListProxy;

    await vaultProxy
      .connect(marketAdmin)
      .setupRewardParameters('604800', '59', 0, '1000000000000000000');

    mochiRewardToken_ETH = await ethers.getContractAt(
      'MochiRewardToken',
      await vaultProxy.getRewardToken(ETH_Address)
    );
  });

  it('All setup successfully', async () => {
    expect(await nftListProxy.addressesProvider()).to.equal(
      addressesProvider.address
    );
    expect(await vaultProxy.addressesProvider()).to.equal(
      addressesProvider.address
    );
    expect(await sellOrderListProxy.addressesProvider()).to.equal(
      addressesProvider.address
    );
    expect(await marketProxy.addressesProvider()).to.equal(
      addressesProvider.address
    );
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);
  });

  it('Call updateFee failed cause caller is not market admin', async () => {
    await expect(
      marketProxy.connect(alice).updateFee('3', '1000')
    ).to.be.revertedWith(ERRORS.CALLER_NOT_MARKET_ADMIN);
  });

  it('Call updateFee successfully cause caller is  market admin', async () => {
    await marketProxy.connect(marketAdmin).updateFee('3', '1000');

    let fee = await marketProxy.getFee();

    expect(fee[0]).to.equal('3');
    expect(fee[1]).to.equal('1000');
  });

  context('Setup ERC721', async () => {
    beforeEach(async () => {
      testERC721 = await deployTestERC721(alice, 'TestERC721', 'TestERC721');

      nonAccepetedERC721 = await deployTestERC721(
        alice,
        'Non-Accepted',
        'Non-Accepted'
      );

      await nftListProxy.connect(alice).registerNFT(testERC721.address, false);
      await nftListProxy.connect(marketAdmin).acceptNFT(testERC721.address);
      await testERC721.connect(alice).mint(alice.address, tokenId);
    });

    it('create sell failed cause nft address has not been accepted', async () => {
      await expect(
        marketProxy
          .connect(alice)
          .createSellOrder(
            nonAccepetedERC721.address,
            tokenId,
            '1',
            price,
            ETH_Address
          )
      ).to.be.revertedWith(ERRORS.NFT_NOT_ACCEPTED);
    });

    it('create sell order failed cause caller is not nft owner', async () => {
      await expect(
        marketProxy
          .connect(bob)
          .createSellOrder(testERC721.address, tokenId, '1', price, ETH_Address)
      ).to.be.revertedWith(ERRORS.CALLER_NOT_NFT_OWNER);
    });

    it('create sell order failed cause nft has not been approved for market', async () => {
      await expect(
        marketProxy
          .connect(alice)
          .createSellOrder(testERC721.address, tokenId, '1', price, ETH_Address)
      ).to.be.revertedWith(ERRORS.NFT_NOT_APPROVED_FOR_MARKET);
    });

    context('Sell order is created successfully', async () => {
      let sellId;
      beforeEach(async () => {
        await testERC721.connect(alice).approve(marketProxy.address, tokenId);

        await marketProxy
          .connect(alice)
          .createSellOrder(
            testERC721.address,
            tokenId,
            '1',
            price,
            ETH_Address
          );

        let data = await sellOrderListProxy.getLatestSellId_ERC721(
          testERC721.address,
          tokenId
        );

        expect(data.found).to.be.equal(true);
        sellId = data.id;
      });

      it('create sell order successfully', async () => {
        let sellInfo = await sellOrderListProxy.getSellOrderById(sellId);

        expect(sellInfo.nftAddress).to.be.equal(testERC721.address);
        expect(sellInfo.seller).to.be.equal(alice.address);
        expect(sellInfo.tokenId).to.be.equal(tokenId);
        expect(sellInfo.price).to.be.equal(price);
        expect(sellInfo.isActive).to.be.equal(true);
        expect(sellInfo.amount).to.be.equal(1);
        expect(sellInfo.token).to.be.equal(ETH_Address);
        expect(sellInfo.soldAmount).to.be.equal(0);

        expect(
          await sellOrderListProxy.checkDuplicate_ERC721(
            testERC721.address,
            tokenId,
            alice.address
          )
        ).to.be.equal(true);
      });

      it('create sell order failed due to duplicate', async () => {
        await expect(
          marketProxy
            .connect(alice)
            .createSellOrder(
              testERC721.address,
              tokenId,
              '1',
              price,
              ETH_Address
            )
        ).to.be.revertedWith(ERRORS.SELL_ORDER_DUPLICATE);
      });

      it('cancle sell order failed cause caller is not seller', async () => {
        await expect(
          marketProxy.connect(bob).cancleSellOrder(sellId)
        ).to.be.revertedWith(ERRORS.CALLER_NOT_SELLER);
      });

      it('cancle sell order successfully', async () => {
        await marketProxy.connect(alice).cancleSellOrder(sellId);

        let sellInfor = await sellOrderListProxy.getSellOrderById(sellId);

        let result = await sellOrderListProxy.getAvailableSellOrdersIdList();
        expect(result.erc721.length).to.be.equal(0);

        result = await sellOrderListProxy.getAvailableSellOrdersIdListByNftAddress(
          testERC721.address
        );

        expect(result.length).to.be.equal(0);
        rsult = await sellOrderListProxy.getAvailableSellOrdersIdListByUser(
          alice.address
        );
        expect(result.length).to.be.equal(0);
        expect(sellInfor.isActive).to.be.equal(false);
      });

      it('cancle sell order failed cause sellOrder is not active', async () => {
        await marketProxy.connect(alice).cancleSellOrder(sellId);
        await expect(
          marketProxy.connect(alice).cancleSellOrder(sellId)
        ).to.be.revertedWith(ERRORS.SELL_ORDER_NOT_ACTIVE);
      });

      it('update price failed cause caller is not seller', async () => {
        await expect(
          marketProxy.connect(bob).updatePrice(sellId, '2000000')
        ).to.be.revertedWith(ERRORS.CALLER_NOT_SELLER);
      });

      it('update price failed cause price not change', async () => {
        await expect(
          marketProxy.connect(alice).updatePrice(sellId, price)
        ).to.be.revertedWith(ERRORS.PRICE_NOT_CHANGE);
      });

      it('update price failed cause sell order is not active', async () => {
        await marketProxy.connect(alice).cancleSellOrder(sellId);

        await expect(
          marketProxy.connect(alice).updatePrice(sellId, price)
        ).to.be.revertedWith(ERRORS.SELL_ORDER_NOT_ACTIVE);
      });

      it('update price successfully', async () => {
        await marketProxy.connect(alice).updatePrice(sellId, '2000000');
        let sellInfo = await sellOrderListProxy.getSellOrderById(sellId);

        expect(sellInfo.price).to.be.equal('2000000');
      });

      it('buy failed cause caller is seller', async () => {
        await expect(
          marketProxy
            .connect(alice)
            .buy(sellId, '1', alice.address, '0x', { value: price })
        ).to.be.revertedWith(ERRORS.CALLER_IS_SELLER);
      });

      it('buy failed cause sell order was cancled', async () => {
        await marketProxy.connect(alice).cancleSellOrder(sellId);

        await expect(
          marketProxy
            .connect(bob)
            .buy(sellId, '1', bob.address, '0x', { value: price })
        ).to.be.revertedWith(ERRORS.SELL_ORDER_NOT_ACTIVE);
      });

      it('buy failed cause msg.value is not equal price', async () => {
        await expect(
          marketProxy
            .connect(bob)
            .buy(sellId, '1', bob.address, '0x', { value: 999999 })
        ).to.be.revertedWith(ERRORS.VALUE_NOT_EQUAL_PRICE);

        await expect(
          marketProxy
            .connect(bob)
            .buy(sellId, '1', bob.address, '0x', { value: 1000001 })
        ).to.be.revertedWith(ERRORS.VALUE_NOT_EQUAL_PRICE);
      });

      it('buy successfully', async () => {
        await marketProxy
          .connect(bob)
          .buy(sellId, '1', bob.address, '0x', { value: price });

        expect(await testERC721.ownerOf(tokenId)).to.be.equal(bob.address);
        expect(await vaultProxy.getMochiFund(ETH_Address)).to.be.equal(
          (((price * FEE.NUMERATOR) / FEE.DENOMINATOR) * 8) / 10
        );

        let sellInfor = await sellOrderListProxy.getSellOrderById(sellId);

        expect(sellInfor.buyers).to.be.include(bob.address);
        expect(sellInfor.isActive).to.be.equal(false);

        let result = await sellOrderListProxy.getAvailableSellOrdersIdList();

        expect(result.erc721.length).to.be.equal(0);

        result = await sellOrderListProxy.getAvailableSellOrdersIdListByNftAddress(
          testERC721.address
        );

        expect(result.length).to.be.equal(0);

        result = await sellOrderListProxy.getAvailableSellOrdersIdListByUser(
          alice.address
        );

        expect(result.erc721.length).to.be.equal(0);
      });
    });
  });
});
