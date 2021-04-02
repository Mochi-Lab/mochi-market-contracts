/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { deployAddressesProvider, allSetup } = require('../helpers');
const { ERRORS } = require('../constans');

describe('Vault', async () => {
  let addressesProvider, vaultProxy, marketProxy;
  let deployer, marketAdmin, user;
  let ETH_Address = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    [deployer, marketAdmin, user] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    let result = await allSetup(deployer, addressesProvider, deployer, marketAdmin);
    addressesProvider = result.addressesProvider;
    vaultProxy = result.vaultProxy;
    marketProxy = result.marketProxy;
  });

  it('All setup successfully', async () => {
    expect(await vaultProxy.addressesProvider()).to.equal(addressesProvider.address);
    expect(await addressesProvider.getVault()).to.equal(vaultProxy.address);
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);
  });

  // it('Depost fail cause sender is not market', async () => {
  //   await expect(
  //     vaultProxy.connect(user).deposit(10000, { value: 10000 })
  //   ).to.be.revertedWith(ERRORS.CALLER_NOT_MARKET);
  // });

  it('Vithdraw failed cause caller is not market admin', async () => {
    await expect(
      vaultProxy.connect(user).withdrawFund(ETH_Address, 1000, user.address)
    ).to.be.revertedWith(ERRORS.CALLER_NOT_MARKET_ADMIN);
  });

  it('Vithdraw failed due to insufficient balance', async () => {
    await expect(
      vaultProxy.connect(marketAdmin).withdrawFund(ETH_Address, 1000, marketAdmin.address)
    ).to.be.revertedWith(ERRORS.INSUFFICIENT_BALANCE);
  });
});
