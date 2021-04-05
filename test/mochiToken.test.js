const { ethers } = require('hardhat');
const { expect, use } = require('chai');
const { time, expectRevert } = require('@openzeppelin/test-helpers');

describe('Mochi Token', async () => {
  let admin, alice, bob, charles, daniel;
  let mochi;
  let blacklistEffectiveDuration = 30; // 30 days
  let blacklistLockDuration = 50; // 50 days

  beforeEach('Deploy Mochi', async () => {
    [admin, alice, bob, charles, daniel] = await ethers.getSigners();

    const MochiToken = await ethers.getContractFactory('MOCHI');
    mochi = await MochiToken.connect(admin).deploy();
    await mochi.deployed();
  });

  it('Init balance of admin', async () => {
    const adminBalance = await mochi.balanceOf(admin.address);
    expect(adminBalance.toString()).to.equal('59000000000000000000000000');
  });

  describe('Blacklist', () => {
    it('Admin can add user to blacklist witexpectReverthin blacklist effective time', async () => {
      await mochi.connect(admin).addToBlacklist(alice.address);
      const isBlocked = await mochi.isBlocked(alice.address);
      expect(isBlocked).to.equal(true);
    });

    it('Admin can not add user to blacklist when blacklist effective time ended', async () => {
      await time.increase(time.duration.days(blacklistEffectiveDuration));
      await expectRevert(
        mochi.connect(admin).addToBlacklist(alice.address),
        'MOCHI: Force lock time ended'
      );
    });

    it('User not in blacklist can send MOCHI', async () => {
      await mochi.connect(admin).mint(alice.address, '123456');
      expect((await mochi.balanceOf(alice.address)).toString()).to.equal(
        '123456'
      );
      await mochi.connect(alice).transfer(bob.address, '456');
      expect((await mochi.balanceOf(alice.address)).toString()).to.equal(
        '123000'
      );
      expect((await mochi.balanceOf(bob.address)).toString()).to.equal('456');
      await mochi.connect(alice).approve(bob.address, '3000');
      await mochi
        .connect(bob)
        .transferFrom(alice.address, charles.address, '2000');

      expect((await mochi.balanceOf(alice.address)).toString()).to.equal(
        '121000'
      );
      expect((await mochi.balanceOf(bob.address)).toString()).to.equal('456');
      expect((await mochi.balanceOf(charles.address)).toString()).to.equal(
        '2000'
      );
    });

    it('User in blacklist cannot send any MOCHI', async () => {
      await mochi.connect(admin).mint(alice.address, '123456');
      await mochi.connect(admin).addToBlacklist(alice.address);
      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '456'),
        'MOCHI BLACKLIST: cannot transfer locked balance'
      );

      await mochi.connect(alice).approve(bob.address, '3000');

      await expectRevert(
        mochi.connect(bob).transferFrom(alice.address, charles.address, '2000'),
        'MOCHI BLACKLIST: cannot transfer locked balance'
      );
    });

    it('User in blacklist can claim token daily through 50 days', async () => {
      await mochi.connect(admin).mint(alice.address, '1000');
      await mochi.connect(admin).addToBlacklist(alice.address);

      await time.increase(time.duration.days(1));
      let unlockedBalance;
      unlockedBalance = await mochi.checkUnlockedBalance(alice.address);
      expect(unlockedBalance.toString()).to.equal('20');

      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '45'),
        'MOCHI BLACKLIST: cannot transfer locked balance'
      );

      await mochi.connect(alice).transfer(bob.address, '1');
      await mochi.connect(alice).transfer(bob.address, '2');
      await mochi.connect(alice).transfer(bob.address, '3');

      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '20'),
        'MOCHI BLACKLIST: cannot transfer locked balance'
      );

      await time.increase(time.duration.days(49));
      unlockedBalance = await mochi.checkUnlockedBalance(alice.address);
      expect(unlockedBalance.toString()).to.equal('1000');
    });

    it('Remove from blacklist', async () => {
      await mochi.connect(admin).mint(alice.address, '1000');
      await mochi.connect(admin).addToBlacklist(alice.address);

      await time.increase(time.duration.days(5));
      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '400'),
        'MOCHI BLACKLIST: cannot transfer locked balance'
      );

      await mochi.connect(admin).removeFromBlacklist(alice.address);
      await mochi.connect(alice).transfer(bob.address, '400');

      expect((await mochi.balanceOf(alice.address)).toString()).to.equal('600');
    });
  });
});
