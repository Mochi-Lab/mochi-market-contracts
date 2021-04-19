/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { NATIVE_TOKEN, ROYALTY } = require('../constans');

const {
  deployAddressesProvider,
  allSetup,
  deployTestERC1155,
  deployTestERC721,
  deployTestERC20,
} = require('../helpers');
const { ERRORS } = require('../constans');

describe('Vault Contract', async () => {
  let addressesProvider, vault, market;
  let moma;
  let deployer, marketAdmin, alice, bob;
  let ETH_Address = '0x0000000000000000000000000000000000000000';
  let nftERC721;
  let dai;
  let periodOfCycle = '604800'; // Every 7 days the rate will be halved
  let numberOfCycle = '59'; // Total number of halves

  beforeEach(async () => {
    [deployer, marketAdmin, alice, bob] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    moma = await deployTestERC20(deployer, 'MOchi MArket Token', 'MOMA');

    let modules = await allSetup(deployer, addressesProvider, deployer, marketAdmin, moma.address);
    addressesProvider = modules.addressesProvider;
    vault = modules.vaultProxy;
    market = modules.marketProxy;

    nftERC721 = await deployTestERC721(deployer, 'TestERC721', 'TestERC721');
    nftERC1155 = await deployTestERC1155(deployer, 'TestERC1155');
    dai = await deployTestERC20(deployer, 'DAI Token', 'DAI');
  });

  it('All deploy successfully', async () => {
    expect(await vault.addressesProvider()).to.equal(addressesProvider.address);
    expect(await addressesProvider.getVault()).to.equal(vault.address);
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);

    let rewardTokenForNativeToken = await ethers.getContractAt(
      'MochiRewardToken',
      await vault.getRewardToken(ETH_Address)
    );

    expect(await rewardTokenForNativeToken.name()).to.be.equal('rMOCHI for: ' + NATIVE_TOKEN);
    expect(await rewardTokenForNativeToken.symbol()).to.be.equal('rMOCHI_' + NATIVE_TOKEN);

    let royalty = await vault.getRoyaltyParameters();
    expect(parseInt(royalty[0])).to.be.equal(ROYALTY.NUMERATOR);
    expect(parseInt(royalty[1])).to.be.equal(ROYALTY.DENOMINATOR);
  });

  it('Deposit fail cause sender is not Market', async () => {
    await expectRevert(
      vault
        .connect(marketAdmin)
        .deposit(nftERC721.address, alice.address, bob.address, ETH_Address, 10000, {
          value: 10000,
        }),
      ERRORS.CALLER_NOT_MARKET
    );

    await expectRevert(
      vault
        .connect(deployer)
        .deposit(nftERC721.address, alice.address, bob.address, ETH_Address, 10000, {
          value: 10000,
        }),
      ERRORS.CALLER_NOT_MARKET
    );

    await expectRevert(
      vault
        .connect(alice)
        .deposit(nftERC721.address, alice.address, bob.address, ETH_Address, 10000, {
          value: 10000,
        }),
      ERRORS.CALLER_NOT_MARKET
    );

    await expectRevert(
      vault
        .connect(bob)
        .deposit(nftERC721.address, alice.address, bob.address, ETH_Address, 10000, {
          value: 10000,
        }),
      ERRORS.CALLER_NOT_MARKET
    );

    await expectRevert(
      vault
        .connect(marketAdmin)
        .deposit(nftERC721.address, alice.address, bob.address, dai.address, 10000),
      ERRORS.CALLER_NOT_MARKET
    );

    await expectRevert(
      vault
        .connect(deployer)
        .deposit(nftERC721.address, alice.address, bob.address, dai.address, 10000),
      ERRORS.CALLER_NOT_MARKET
    );

    await expectRevert(
      vault
        .connect(alice)
        .deposit(nftERC721.address, alice.address, bob.address, dai.address, 10000),
      ERRORS.CALLER_NOT_MARKET
    );

    await expectRevert(
      vault.connect(bob).deposit(nftERC721.address, alice.address, bob.address, dai.address, 10000),
      ERRORS.CALLER_NOT_MARKET
    );
  });

  it('User who is not Market Admin cannot setup reward parameters', async () => {
    let startTime = parseInt(await time.latest()) + parseInt(time.duration.days('1'));
    await expectRevert(
      vault
        .connect(deployer)
        .setupRewardParameters(periodOfCycle, numberOfCycle, startTime, '1000000000000000000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      vault
        .connect(alice)
        .setupRewardParameters(periodOfCycle, numberOfCycle, startTime, '1000000000000000000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      vault
        .connect(bob)
        .setupRewardParameters(periodOfCycle, numberOfCycle, startTime, '1000000000000000000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin setups fail with invalid parameters', async () => {
    let startTime = parseInt(await time.latest()) + parseInt(time.duration.days('1'));
    await expectRevert(
      vault
        .connect(marketAdmin)
        .setupRewardParameters(0, numberOfCycle, startTime, '1000000000000000000'),
      ERRORS.PERIOD_MUST_BE_GREATER_THAN_ZERO
    );

    await expectRevert(
      vault
        .connect(marketAdmin)
        .setupRewardParameters(periodOfCycle, '0', startTime, '1000000000000000000'),
      ERRORS.NUMBER_OF_CYCLE_MUST_BE_GREATER_THAN_ZERO
    );

    await expectRevert(
      vault
        .connect(marketAdmin)
        .setupRewardParameters(periodOfCycle, numberOfCycle, '1', '1000000000000000000'),
      ERRORS.INVALID_START_TIME
    );

    await expectRevert(
      vault
        .connect(marketAdmin)
        .setupRewardParameters(periodOfCycle, numberOfCycle, startTime, '0'),
      ERRORS.FIRST_RATE_MUST_BE_GREATER_THAN_ZERO
    );
  });

  it('Market Admin setups reward parameters successfully', async () => {
    let startTime = parseInt(await time.latest()) + parseInt(time.duration.days(1));
    await vault
      .connect(marketAdmin)
      .setupRewardParameters(periodOfCycle, numberOfCycle, startTime, '1000000000000000000');

    await time.increase(time.duration.days('6'));
    expect(await vault.getCurrentPeriod()).to.be.equal('0');
    expect(await vault.getCurrentRate()).to.be.equal('1000000000000000000');

    await time.increase(time.duration.days('10'));
    expect(await vault.getCurrentPeriod()).to.be.equal('2');
    expect(await vault.getCurrentRate()).to.be.equal('250000000000000000');
  });

  it('User who is not Market Admin cannot update royalty parameters', async () => {
    await expectRevert(
      vault.connect(deployer).updateRoyaltyParameters('25', '100'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      vault.connect(alice).updateRoyaltyParameters('25', '100'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      vault.connect(bob).updateRoyaltyParameters('25', '100'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin updates royalty parameters successfully', async () => {
    await vault.connect(marketAdmin).updateRoyaltyParameters('25', '100');
    let parameters = await vault.getRoyaltyParameters();

    expect(parameters[0]).to.be.equal('25');
    expect(parameters[1]).to.be.equal('100');
  });

  it('User who is not Market Admin cannot withdraw market fund', async () => {
    await expectRevert(
      vault.connect(deployer).withdrawFund(ETH_Address, 1000, deployer.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      vault.connect(alice).withdrawFund(ETH_Address, 1000, alice.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      vault.connect(bob).withdrawFund(ETH_Address, 1000, bob.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Vithdraw failed due to insufficient balance', async () => {
    await expectRevert(
      vault.connect(marketAdmin).withdrawFund(ETH_Address, 1000, marketAdmin.address),
      ERRORS.INSUFFICIENT_BALANCE
    );
  });
});
