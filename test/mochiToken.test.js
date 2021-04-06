const { ethers } = require('hardhat');
const { expect, use } = require('chai');
const { time, expectRevert } = require('@openzeppelin/test-helpers');

describe('Mochi Token', async () => {
  let admin, alice, bob, charles, team, developmentFunds, ecosystemFunds;
  let mochi;
  let blacklistEffectiveDuration = 30; // 30 days
  let blacklistLockDuration = 50; // 50 days

  beforeEach('Deploy Mochi', async () => {
    [
      admin,
      alice,
      bob,
      charles,
      team,
      developmentFunds,
      ecosystemFunds,
    ] = await ethers.getSigners();

    const MochiToken = await ethers.getContractFactory('MOCHI');
    mochi = await MochiToken.connect(admin).deploy();
    await mochi.deployed();
  });

  it('Init balance of admin', async () => {
    const adminBalance = await mochi.balanceOf(admin.address);
    expect(adminBalance).to.equal('59000000000000000000000000');
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
      expect(await mochi.balanceOf(alice.address)).to.equal('123456');
      await mochi.connect(alice).transfer(bob.address, '456');
      expect(await mochi.balanceOf(alice.address)).to.equal('123000');
      expect(await mochi.balanceOf(bob.address)).to.equal('456');
      await mochi.connect(alice).approve(bob.address, '3000');
      await mochi.connect(bob).transferFrom(alice.address, charles.address, '2000');

      expect(await mochi.balanceOf(alice.address)).to.equal('121000');
      expect(await mochi.balanceOf(bob.address)).to.equal('456');
      expect(await mochi.balanceOf(charles.address)).to.equal('2000');
    });

    it('User in blacklist cannot send any MOCHI', async () => {
      await mochi.connect(admin).mint(alice.address, '123456');
      await mochi.connect(admin).addToBlacklist(alice.address);
      const remainLockedBalance = await mochi.remainLockedBalance(alice.address);

      let blacklistUser = await mochi.getBlacklistByUser(alice.address);
      expect(remainLockedBalance).to.equal('123456');

      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '456'),
        'MOCHI BLACKLIST: Cannot transfer locked balance'
      );

      await mochi.connect(alice).approve(bob.address, '3000');

      await expectRevert(
        mochi.connect(bob).transferFrom(alice.address, charles.address, '2000'),
        'MOCHI BLACKLIST: Cannot transfer locked balance'
      );
    });

    it('User in blacklist can claim token daily in 50 days', async () => {
      await mochi.connect(admin).mint(alice.address, '1000');
      await mochi.connect(admin).addToBlacklist(alice.address);

      await time.increase(time.duration.days(1));
      let remainLockedBalance;
      remainLockedBalance = await mochi.remainLockedBalance(alice.address);
      expect(remainLockedBalance).to.equal('980');

      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '45'),
        'MOCHI BLACKLIST: Cannot transfer locked balance'
      );
      await mochi.connect(alice).transfer(bob.address, '1');
      await mochi.connect(alice).transfer(bob.address, '2');
      await mochi.connect(alice).transfer(bob.address, '3');

      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '20'),
        'MOCHI BLACKLIST: Cannot transfer locked balance'
      );

      await time.increase(time.duration.days(49));
      remainLockedBalance = await mochi.remainLockedBalance(alice.address);
      expect(remainLockedBalance).to.equal('0');
    });

    it('Remove from blacklist', async () => {
      await mochi.connect(admin).mint(alice.address, '1000');
      await mochi.connect(admin).addToBlacklist(alice.address);

      await time.increase(time.duration.days(5));
      await expectRevert(
        mochi.connect(alice).transfer(bob.address, '400'),
        'MOCHI BLACKLIST: Cannot transfer locked balance'
      );

      await mochi.connect(admin).removeFromBlacklist(alice.address);
      await mochi.connect(alice).transfer(bob.address, '400');

      expect(await mochi.balanceOf(alice.address)).to.equal('600');
    });

    describe('Vesting tokens', () => {
      it('Team and Advisors lock up', async () => {
        let currentTime = await time.latest();
        let releaseFrom = parseInt(currentTime) + parseInt(time.duration.years(1));
        await mochi.connect(admin).addVestingToken(team.address, '18000000', 360, releaseFrom);

        let claimableAmount;
        claimableAmount = await mochi.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal(0);

        await expectRevert(mochi.connect(team).claimVestingToken(), 'MOCHI: Nothing to claim');
        await time.increase(time.duration.years(1));
        claimableAmount = await mochi.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('50000');

        await mochi.connect(team).claimVestingToken();
        await expectRevert(mochi.connect(team).claimVestingToken(), 'MOCHI: Nothing to claim');

        await time.increase(time.duration.days(358));
        claimableAmount = await mochi.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('17900000');

        await time.increase(time.duration.days(1));
        claimableAmount = await mochi.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('17950000');
      });
    });

    it('Development funds lock up', async () => {
      await mochi.connect(admin).addVestingToken(developmentFunds.address, '16000000', 1800, 0);

      let claimableAmount;
      claimableAmount = await mochi.getVestingClaimableAmount(developmentFunds.address);
      expect(claimableAmount).to.gte(8888);

      await time.increase(time.duration.days(29));
      claimableAmount = await mochi.getVestingClaimableAmount(developmentFunds.address);
      expect(claimableAmount).to.gte(266666);

      await mochi.connect(developmentFunds).claimVestingToken();
      await expectRevert(
        mochi.connect(developmentFunds).claimVestingToken(),
        'MOCHI: Nothing to claim'
      );

      await time.increase(time.duration.days(1770));
      claimableAmount = await mochi.getVestingClaimableAmount(developmentFunds.address);
      expect(claimableAmount).to.gte(16000000 - 266667);
    });

    it('Ecosystem funds lock up', async () => {
      await mochi.connect(admin).addVestingToken(ecosystemFunds.address, '23000000', 3600, 0);

      let claimableAmount;
      claimableAmount = await mochi.getVestingClaimableAmount(ecosystemFunds.address);
      expect(claimableAmount).to.gte(6388);

      await time.increase(time.duration.days(29));
      claimableAmount = await mochi.getVestingClaimableAmount(ecosystemFunds.address);
      expect(claimableAmount).to.gte(191666);

      await mochi.connect(ecosystemFunds).claimVestingToken();
      await expectRevert(
        mochi.connect(ecosystemFunds).claimVestingToken(),
        'MOCHI: Nothing to claim'
      );

      await time.increase(time.duration.days(3570));
      claimableAmount = await mochi.getVestingClaimableAmount(ecosystemFunds.address);
      expect(claimableAmount).to.gte(23000000 - 191667);
    });
  });
});
