// SPDX-License-Identifier:GPL-3.0
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MochiVesting is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    IERC20 public mochiToken;

    struct VestingInfo {
        uint256 amount;
        uint256 vestingDays;
        uint256 unlockFrom;
    }

    mapping(address => VestingInfo) public vestingList;

    constructor(address _mochiAddress) public {
        mochiToken = IERC20(_mochiAddress);
    }

    function addVestingToken(
        address recipient,
        uint256 amount,
        uint256 vestingDay,
        uint256 unlockFrom
    ) public onlyOwner {
        require(recipient != address(0), "MOCHI VESTING: Zero address");
        require(unlockFrom >= block.number, "MOCHI: Unlock time cannot be past time");
        require(
            vestingList[recipient].amount == 0 &&
                vestingList[recipient].vestingDays == 0 &&
                vestingList[recipient].unlockFrom == 0,
            "MOCHI VESTING: Invalid vesting"
        );
        vestingList[recipient] = VestingInfo(amount, vestingDay, unlockFrom);
    }

    function adjustVestingToken(
        address recipient,
        uint256 vestingDays,
        uint256 unlockFrom
    ) public onlyOwner {
        require(recipient != address(0), "MOCHI VESTING: zero address");
        require(unlockFrom >= block.number, "MOCHI: Unlock time cannot be past time");
        VestingInfo memory info = vestingList[recipient];
        require(
            info.amount != 0 && info.vestingDays != 0 && info.unlockFrom != 0,
            "MOCHI VESTING: Vesting not exist"
        );
        info.vestingDays = vestingDays;
        info.unlockFrom = unlockFrom;

        vestingList[recipient] = info;
    }

    function claimVestingToken() public nonReentrant returns (uint256) {
        VestingInfo memory info = vestingList[msg.sender];
        require(info.amount > 0, "MOCHI VESTING: Nothing to claim");
        require(block.number >= info.unlockFrom, "MOCHI VESTING: Claim early now allowed");

        uint256 pastDuration = block.number.sub(info.unlockFrom);
        uint256 claimableAmount = pastDuration.div(info.vestingDays.mul(8640)).mul(info.amount);
        require(
            mochiToken.balanceOf(address(this)) >= claimableAmount,
            "MOCHI VESTING: Run out of MOCHI"
        );
        mochiToken.transfer(msg.sender, claimableAmount);
    }
}
