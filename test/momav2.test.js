const { ethers } = require('hardhat');
const { expect, use } = require('chai');
const { time, expectRevert } = require('@openzeppelin/test-helpers');

describe('MOMA Token', () => {
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

    const MochiToken = await ethers.getContractFactory('contracts/MOMAv2.sol:MOMA');
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
  });

  describe('Monthly Vesting', () => {
    describe('Team and Advisors vesting', () => {
      /**
       * 0 Unlocked at IDO
       * Vest 18,000,000 MOMA token
       * Full lock 360 days
       * After 360 days, unlock in 12 rounds, each round 30 days
       */
      beforeEach(async () => {
        await moma.connect(admin).addVestingToken(team.address, '18000000', 360, 12, 30);
      });

      it('Claimable amount at first is 0', async () => {
        const claimableAmount = await moma.connect(team).getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal(0);
      });

      it('Revert when team want to claim early', async () => {
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
        await time.increase(time.duration.days(360));
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
        await time.increase(time.duration.days(29));
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
      });

      it('After 360000 days, claimable amount is total vesting amount', async () => {
        await time.increase(time.duration.days(360000));
        const claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('18000000');
      });

      it('After 390 days, claimable amount in first round is 1,500,000', async () => {
        await time.increase(time.duration.days(390));
        const claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('1500000');
      });

      it('After 390 days, team claim first round of vesting token', async () => {
        await time.increase(time.duration.days(390));
        await moma.connect(team).claimVestingToken();
        expect(await moma.balanceOf(team.address)).to.equal('1500000');
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
      });

      it('After 420 days, team can claim two round value of vesting token if did not claim before', async () => {
        await time.increase(time.duration.days(420));
        await moma.connect(team).claimVestingToken();
        expect(await moma.balanceOf(team.address)).to.equal('3000000');
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
      });

      it('After 420 days, team can claim second round of vesting token', async () => {
        let claimableAmount;
        await time.increase(time.duration.days(400));
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('1500000');
        await moma.connect(team).claimVestingToken();
        expect(await moma.balanceOf(team.address)).to.equal('1500000');
        await time.increase(time.duration.days(20));
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('1500000');
        await moma.connect(team).claimVestingToken();
        expect(await moma.balanceOf(team.address)).to.equal('3000000');
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('0');
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
      });

      it('After 720 days, claimable amount is 18,000,000', async () => {
        let claimableAmount;
        await time.increase(time.duration.days(720));
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('18000000');
        await moma.connect(team).claimVestingToken();
        expect(await moma.balanceOf(team.address)).to.equal('18000000');
        claimableAmount = await moma.getVestingClaimableAmount(team.address);
        expect(claimableAmount).to.equal('0');
        await expectRevert(moma.connect(team).claimVestingToken(), 'MOMA: Nothing to claim');
      });
    });

    describe('Development funds vesting', () => {
      /**
       * 266,666 unlocked at IDO
       * Vest 15,733,333 MOMA token
       * Full lock 0 days
       * Unlock in 59 rounds, each round 30 days
       */
      beforeEach(async () => {
        await moma.connect(admin).addVestingToken(developmentFunds.address, '15733333', 0, 59, 30);
      });

      it('Claimable amount at first is 0', async () => {
        const claimableAmount = await moma
          .connect(developmentFunds)
          .getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.equal(0);
      });

      it('Revert when developmentFunds want to claim early', async () => {
        await expectRevert(
          moma.connect(developmentFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 360000 days, claimable amount is total vesting amount', async () => {
        await time.increase(time.duration.days(360000));
        const claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.equal('15733333');
      });

      it('After 30 days, claimable amount in first round is greater than 266,666', async () => {
        await time.increase(time.duration.days(30));
        const claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.gte('266666');
      });

      it('After 30 days, developmentFunds claim first round of vesting token', async () => {
        await time.increase(time.duration.days(30));
        await moma.connect(developmentFunds).claimVestingToken();
        expect(await moma.balanceOf(developmentFunds.address)).to.gte('266666');
        await expectRevert(
          moma.connect(developmentFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 60 days, developmentFunds can claim two round value of vesting token if did not claim before', async () => {
        await time.increase(time.duration.days(60));
        await moma.connect(developmentFunds).claimVestingToken();
        expect(await moma.balanceOf(developmentFunds.address)).to.equal('533333');
        await expectRevert(
          moma.connect(developmentFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 60 days, developmentFunds can claim second round of vesting token', async () => {
        let claimableAmount;
        await time.increase(time.duration.days(30));
        claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.gte('266666');
        await moma.connect(developmentFunds).claimVestingToken();
        expect(await moma.balanceOf(developmentFunds.address)).to.gte('266666');
        await time.increase(time.duration.days(30));
        claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.gte('266666');
        await moma.connect(developmentFunds).claimVestingToken();
        expect(await moma.balanceOf(developmentFunds.address)).to.equal('533333');
        claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.equal('0');
        await expectRevert(
          moma.connect(developmentFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 1770 days, claimable amount is greater than 15,733,333', async () => {
        let claimableAmount;
        await time.increase(time.duration.days(1770));
        claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.equal('15733333');
        await moma.connect(developmentFunds).claimVestingToken();
        expect(await moma.balanceOf(developmentFunds.address)).to.equal('15733333');
        claimableAmount = await moma.getVestingClaimableAmount(developmentFunds.address);
        expect(claimableAmount).to.equal('0');
        await expectRevert(
          moma.connect(developmentFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });
    });

    describe('Ecosystem funds vesting', () => {
      /**
       * 383333 unlocked at IDO
       * Vest 22,616,666 MOMA token
       * Full lock 0 days
       * Unlock in 59 rounds, each round 30 days
       */
      beforeEach(async () => {
        await moma.connect(admin).addVestingToken(ecosystemFunds.address, '22616666', 0, 59, 30);
      });

      it('Claimable amount at first is 0', async () => {
        const claimableAmount = await moma
          .connect(ecosystemFunds)
          .getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.equal(0);
      });

      it('Revert when ecosystemFunds want to claim early', async () => {
        await expectRevert(
          moma.connect(ecosystemFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 360000 days, claimable amount is total vesting amount', async () => {
        await time.increase(time.duration.days(360000));
        const claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.equal('22616666');
      });

      it('After 30 days, claimable amount in first round is greater than 383,333', async () => {
        await time.increase(time.duration.days(30));
        const claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.equal('383333');
      });

      it('After 30 days, ecosystemFunds claim first round of vesting token', async () => {
        await time.increase(time.duration.days(30));
        await moma.connect(ecosystemFunds).claimVestingToken();
        expect(await moma.balanceOf(ecosystemFunds.address)).to.equal('383333');
        await expectRevert(
          moma.connect(ecosystemFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 60 days, ecosystemFunds can claim two round value of vesting token if did not claim before', async () => {
        await time.increase(time.duration.days(60));
        await moma.connect(ecosystemFunds).claimVestingToken();
        expect(await moma.balanceOf(ecosystemFunds.address)).to.gte('766666');
        await expectRevert(
          moma.connect(ecosystemFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 60 days, ecosystemFunds can claim second round of vesting token', async () => {
        let claimableAmount;
        await time.increase(time.duration.days(30));
        claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.equal('383333');
        await moma.connect(ecosystemFunds).claimVestingToken();
        expect(await moma.balanceOf(ecosystemFunds.address)).to.equal('383333');
        await time.increase(time.duration.days(30));
        claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.equal('383333');
        await moma.connect(ecosystemFunds).claimVestingToken();
        expect(await moma.balanceOf(ecosystemFunds.address)).to.gte('766666');
        claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.equal('0');
        await expectRevert(
          moma.connect(ecosystemFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });

      it('After 1770 days, claimable amount is greater than 22,616,666', async () => {
        let claimableAmount;
        await time.increase(time.duration.days(1770));
        claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.gte('22616666');
        await moma.connect(ecosystemFunds).claimVestingToken();
        expect(await moma.balanceOf(ecosystemFunds.address)).to.gte('22616666');
        claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
        expect(claimableAmount).to.equal('0');
        await expectRevert(
          moma.connect(ecosystemFunds).claimVestingToken(),
          'MOMA: Nothing to claim'
        );
      });
    });
    describe('Ecosystem funds version 2', () => {
      describe('Ecosystem funds vesting', () => {
        /**
         * 369166 unlocked at IDO
         * Total 21,780,833 MOMA token
         * Full lock 0 days
         * Unlock in 59 rounds, each round 30 days
         */
        beforeEach(async () => {
          await moma.connect(admin).addVestingToken(ecosystemFunds.address, '21780833', 0, 59, 30);
        });

        it('Claimable amount at first is 0', async () => {
          const claimableAmount = await moma
            .connect(ecosystemFunds)
            .getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.equal(0);
        });

        it('Revert when ecosystemFunds want to claim early', async () => {
          await expectRevert(
            moma.connect(ecosystemFunds).claimVestingToken(),
            'MOMA: Nothing to claim'
          );
        });
        it('After 360000 days, claimable amount is total vesting amount', async () => {
          await time.increase(time.duration.days(360000));
          const claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.equal('21780833');
        });

        it('After 30 days, claimable amount in first round is greater than 369,166', async () => {
          await time.increase(time.duration.days(30));
          const claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.gte('369166');
        });

        it('After 30 days, ecosystemFunds claim first round of vesting token', async () => {
          await time.increase(time.duration.days(30));
          await moma.connect(ecosystemFunds).claimVestingToken();
          expect(await moma.balanceOf(ecosystemFunds.address)).to.gte('369166');
          await expectRevert(
            moma.connect(ecosystemFunds).claimVestingToken(),
            'MOMA: Nothing to claim'
          );
        });

        it('After 60 days, ecosystemFunds can claim two round value of vesting token if did not claim before', async () => {
          await time.increase(time.duration.days(60));
          await moma.connect(ecosystemFunds).claimVestingToken();
          expect(await moma.balanceOf(ecosystemFunds.address)).to.equal('738333');
          await expectRevert(
            moma.connect(ecosystemFunds).claimVestingToken(),
            'MOMA: Nothing to claim'
          );
        });

        it('After 60 days, ecosystemFunds can claim second round of vesting token', async () => {
          let claimableAmount;
          await time.increase(time.duration.days(30));
          claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.gte('369166');
          await moma.connect(ecosystemFunds).claimVestingToken();
          expect(await moma.balanceOf(ecosystemFunds.address)).to.gte('369166');
          await time.increase(time.duration.days(30));
          claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.gte('369166');
          await moma.connect(ecosystemFunds).claimVestingToken();
          expect(await moma.balanceOf(ecosystemFunds.address)).to.equal('738333');
          claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.equal('0');
          await expectRevert(
            moma.connect(ecosystemFunds).claimVestingToken(),
            'MOMA: Nothing to claim'
          );
        });

        it('After 1770 days, claimable amount is greater than 21,780,833', async () => {
          let claimableAmount;
          await time.increase(time.duration.days(1770));
          claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.equal('21780833');
          await moma.connect(ecosystemFunds).claimVestingToken();
          expect(await moma.balanceOf(ecosystemFunds.address)).to.equal('21780833');
          claimableAmount = await moma.getVestingClaimableAmount(ecosystemFunds.address);
          expect(claimableAmount).to.equal('0');
          await expectRevert(
            moma.connect(ecosystemFunds).claimVestingToken(),
            'MOMA: Nothing to claim'
          );
        });
      });

      describe('Strategic Vesting', () => {
        /**
         * 0 unlocked at IDO
         * Vest 850,000 MOMA token
         * Full lock 180 days
         * After 180 days, unlock in 6 rounds, each round 30 days
         */
        beforeEach(async () => {
          await moma.connect(admin).addVestingToken(bob.address, '850000', 180, 6, 30);
        });

        it('Claimable amount at first is 0', async () => {
          const claimableAmount = await moma.connect(bob).getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.equal(0);
        });

        it('Revert when bob want to claim early', async () => {
          await expectRevert(moma.connect(bob).claimVestingToken(), 'MOMA: Nothing to claim');
          await time.increase(time.duration.days(180));
          await expectRevert(moma.connect(bob).claimVestingToken(), 'MOMA: Nothing to claim');
          await time.increase(time.duration.days(29));
          await expectRevert(moma.connect(bob).claimVestingToken(), 'MOMA: Nothing to claim');
        });

        it('After 360000 days, claimable amount is total vesting amount', async () => {
          await time.increase(time.duration.days(360000));
          const claimableAmount = await moma.getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.equal('850000');
        });

        it('After 210 days, claimable amount in first round is 141,666', async () => {
          await time.increase(time.duration.days(210));
          const claimableAmount = await moma.getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.gte('141666');
        });

        it('After 210 days, bob claim first round of vesting token', async () => {
          await time.increase(time.duration.days(210));
          await moma.connect(bob).claimVestingToken();
          expect(await moma.balanceOf(bob.address)).to.gte('141666');
          await expectRevert(moma.connect(bob).claimVestingToken(), 'MOMA: Nothing to claim');
        });

        it('After 240 days, bob can claim two round value of vesting token if did not claim before', async () => {
          await time.increase(time.duration.days(240));
          await moma.connect(bob).claimVestingToken();
          expect(await moma.balanceOf(bob.address)).to.equal('283333');
          await expectRevert(moma.connect(bob).claimVestingToken(), 'MOMA: Nothing to claim');
        });

        it('After 240 days, bob can claim second round of vesting token', async () => {
          let claimableAmount;
          await time.increase(time.duration.days(210));
          claimableAmount = await moma.getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.gte('141666');
          await moma.connect(bob).claimVestingToken();
          expect(await moma.balanceOf(bob.address)).to.gte('141666');
          await time.increase(time.duration.days(30));
          claimableAmount = await moma.getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.gte('141666');
          await moma.connect(bob).claimVestingToken();
          expect(await moma.balanceOf(bob.address)).to.equal('283333');
          claimableAmount = await moma.getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.equal('0');
          await expectRevert(moma.connect(bob).claimVestingToken(), 'MOMA: Nothing to claim');
        });

        it('After 360 days, claimable amount is 850,000', async () => {
          let claimableAmount;
          await time.increase(time.duration.days(360));
          claimableAmount = await moma.getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.equal('850000');
          await moma.connect(bob).claimVestingToken();
          expect(await moma.balanceOf(bob.address)).to.equal('850000');
          claimableAmount = await moma.getVestingClaimableAmount(bob.address);
          expect(claimableAmount).to.equal('0');
          await expectRevert(moma.connect(bob).claimVestingToken(), 'MOMA: Nothing to claim');
        });
      });
    });
  });
});
