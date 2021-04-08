const { ethers } = require('hardhat');
const { expect, use } = require('chai');
const { time, expectRevert } = require('@openzeppelin/test-helpers');

describe('MOMA Token', async () => {
  let admin, alice, bob, charles, team, developmentFunds, ecosystemFunds;
  let moma;
  let blacklistEffectiveDuration = 30; // 30 days
  let blacklistLockDuration = 50; // 50 days

  beforeEach('Deploy MOMA', async () => {
    [
      admin,
      alice,
      bob,
      charles,
      team,
      developmentFunds,
      ecosystemFunds,
    ] = await ethers.getSigners();

    const MochiToken = await ethers.getContractFactory('contracts/MOMA.sol:MOMA');
    moma = await MochiToken.connect(admin).deploy();
    await moma.deployed();
  });

  it('Check name and symbol', async () => {
    const name = await moma.name();
    expect(name).to.equal('MOchi MArket');
    const symbol = await moma.symbol();
    expect(symbol).to.equal('MOMA');
  });

  it('Init balance of admin', async () => {
    const adminBalance = await moma.balanceOf(admin.address);
    expect(adminBalance).to.equal('5000000000000000000000000');
  });

  describe('Blacklist', () => {
    it('Admin can add user to blacklist within blacklist effective time', async () => {
      await moma.connect(admin).addToBlacklist(alice.address);
      const isBlocked = await moma.isBlocked(alice.address);
      expect(isBlocked).to.equal(true);
    });

    it('Admin cannot add user to blacklist when blacklist effective time ended', async () => {
      await time.increase(time.duration.days(blacklistEffectiveDuration));
      await expectRevert(
        moma.connect(admin).addToBlacklist(alice.address),
        'MOMA: Force lock time ended'
      );
    });

    it('User not in blacklist can send MOMA', async () => {
      await moma.connect(admin).mint(alice.address, '123456');
      expect(await moma.balanceOf(alice.address)).to.equal('123456');
      await moma.connect(alice).transfer(bob.address, '456');
      expect(await moma.balanceOf(alice.address)).to.equal('123000');
      expect(await moma.balanceOf(bob.address)).to.equal('456');
      await moma.connect(alice).approve(bob.address, '3000');
      await moma.connect(bob).transferFrom(alice.address, charles.address, '2000');

      expect(await moma.balanceOf(alice.address)).to.equal('121000');
      expect(await moma.balanceOf(bob.address)).to.equal('456');
      expect(await moma.balanceOf(charles.address)).to.equal('2000');
    });

    it('User in blacklist cannot send locked MOMA', async () => {
      await moma.connect(admin).mint(alice.address, '123456');
      await moma.connect(admin).addToBlacklist(alice.address);
      const remainLockedBalance = await moma.remainLockedBalance(alice.address);
      expect(remainLockedBalance).to.equal('123456');

      await expectRevert(
        moma.connect(alice).transfer(bob.address, '456'),
        'MOMA BLACKLIST: Cannot transfer locked balance'
      );

      await moma.connect(alice).approve(bob.address, '3000');

      await expectRevert(
        moma.connect(bob).transferFrom(alice.address, charles.address, '2000'),
        'MOMA BLACKLIST: Cannot transfer locked balance'
      );
    });

    it('User in blacklist can claim token daily in 50 days', async () => {
      await moma.connect(admin).mint(alice.address, '1000');
      await moma.connect(admin).addToBlacklist(alice.address);

      await time.increase(time.duration.days(1));
      let remainLockedBalance;
      remainLockedBalance = await moma.remainLockedBalance(alice.address);
      expect(remainLockedBalance).to.equal('980');

      await expectRevert(
        moma.connect(alice).transfer(bob.address, '45'),
        'MOMA BLACKLIST: Cannot transfer locked balance'
      );
      await moma.connect(alice).transfer(bob.address, '1');
      await moma.connect(alice).transfer(bob.address, '2');
      await moma.connect(alice).transfer(bob.address, '3');

      await expectRevert(
        moma.connect(alice).transfer(bob.address, '20'),
        'MOMA BLACKLIST: Cannot transfer locked balance'
      );

      await time.increase(time.duration.days(49));
      remainLockedBalance = await moma.remainLockedBalance(alice.address);
      expect(remainLockedBalance).to.equal('0');
    });

    it('Remove from blacklist', async () => {
      await moma.connect(admin).mint(alice.address, '1000');
      await moma.connect(admin).addToBlacklist(alice.address);

      await time.increase(time.duration.days(5));
      await expectRevert(
        moma.connect(alice).transfer(bob.address, '400'),
        'MOMA BLACKLIST: Cannot transfer locked balance'
      );

      await moma.connect(admin).removeFromBlacklist(alice.address);
      await moma.connect(alice).transfer(bob.address, '400');

      expect(await moma.balanceOf(alice.address)).to.equal('600');
    });

    describe('Vesting tokens', () => {
      it('Team and Advisors lock up', async () => {
        let currentTime = await time.latest();
        let releaseFrom = parseInt(currentTime) + parseInt(time.duration.years(1));
        await moma.connect(admin).addVestingToken(team.address, '18000000', 360, releaseFrom);

        let claimableAmount;
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal(0);

        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
        await time.increase(time.duration.years(1));
        await time.increase(time.duration.days(1));
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('50000');

        await moma.connect(team).claimVestingToken();
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');

        await time.increase(time.duration.days(358));
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('17900000');

        await time.increase(time.duration.days(1));
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('17950000');
      });
    });

    it('Development funds lock up', async () => {
      await moma.connect(admin).addVestingToken(developmentFunds.address, '16000000', 1800, 0);

      let claimableAmount;
      claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
      expect(claimableAmount).to.equal(0);

      await time.increase(time.duration.days(1));
      claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
      expect(claimableAmount).to.gte(8888);

      await moma.connect(developmentFunds).claimVestingToken();
      await expectRevert(
        moma.connect(developmentFunds).claimVestingToken(),
        'MOMA: Nothing to claim'
      );

      await time.increase(time.duration.days(1800));
      claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
      expect(claimableAmount).to.gte(16000000 - 8889);
    });

    it('Ecosystem funds lock up', async () => {
      await moma.connect(admin).addVestingToken(ecosystemFunds.address, '23000000', 3600, 0);

      let claimableAmount;
      claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
      expect(claimableAmount).to.equal(0);

      await time.increase(time.duration.days(30));
      claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
      expect(claimableAmount).to.gte(191666);

      await moma.connect(ecosystemFunds).claimVestingToken();
      await expectRevert(
        moma.connect(ecosystemFunds).claimVestingToken(),
        'MOMA: Nothing to claim'
      );

      await time.increase(time.duration.days(3600));
      claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
      expect(claimableAmount).to.gte(23000000 - 191667);
    });
  });
});
