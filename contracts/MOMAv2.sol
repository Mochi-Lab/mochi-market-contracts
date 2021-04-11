// SPDX-License-Identifier:GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @author MochiLab
contract MOMA is ERC20PresetMinterPauser, ReentrancyGuard {
    struct BlacklistInfo {
        bool locked;
        uint256 lockedFrom;
        uint256 initLockedBalance;
    }

    struct VestingInfo {
        bool isActive;
        uint256 amount;
        uint256 startTime;
        uint256 claimedAmount;
        uint256 fullLockedDays;
        uint256 releaseTotalRounds;
        uint256 daysPerRound;
    }

    uint256 private _blacklistEffectiveEndtime;
    mapping(address => BlacklistInfo) private _blacklist;

    mapping(address => VestingInfo) private _vestingList;

    uint256 public constant INITIAL_SUPPLY = 5000000 * DECIMAL_MULTIPLIER;
    uint256 public constant MAX_SUPPLY = 100000000 * DECIMAL_MULTIPLIER;
    uint256 public constant DECIMAL_MULTIPLIER = 10**18;
    uint256 public constant BLACKLIST_LOCK_DAYS = 50;
    uint256 public constant BLACKLIST_EFFECTIVE_DURATION = 30 days;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "MOMA: ADMIN role required");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "MOMA: MINTER role required");
        _;
    }

    constructor() public ERC20PresetMinterPauser("MOchi MArket", "MOMA") {
        _blacklistEffectiveEndtime = block.timestamp + BLACKLIST_EFFECTIVE_DURATION;
        _mint(_msgSender(), INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) public virtual override onlyMinter {
        require(totalSupply().add(amount) <= MAX_SUPPLY, "MOMA: Max supply exceeded");
        _mint(to, amount);
    }

    function isBlocked(address user) external view returns (bool) {
        return _blacklist[user].locked;
    }

    function getBlacklistByUser(address user) external view returns (BlacklistInfo memory) {
        return _blacklist[user];
    }

    function addToBlacklist(address user) external onlyAdmin {
        require(block.timestamp < _blacklistEffectiveEndtime, "MOMA: Force lock time ended");
        _blacklist[user] = BlacklistInfo(true, block.timestamp, balanceOf(user));
    }

    function removeFromBlacklist(address user) external onlyAdmin {
        _blacklist[user].locked = false;
    }

    function _getUnlockedBalance(address user) internal view returns (uint256 unlockedBalance) {
        BlacklistInfo memory info = _blacklist[user];
        uint256 daysPassed = block.timestamp.sub(info.lockedFrom).div(1 days);

        if (info.locked && daysPassed < BLACKLIST_LOCK_DAYS) {
            unlockedBalance = daysPassed.mul(info.initLockedBalance).div(BLACKLIST_LOCK_DAYS);
        } else {
            unlockedBalance = info.initLockedBalance;
        }
        return unlockedBalance;
    }

    function remainLockedBalance(address user) public view returns (uint256) {
        return _blacklist[user].initLockedBalance.sub(_getUnlockedBalance(user));
    }

    function addVestingToken(
        address beneficiary,
        uint256 amount,
        uint256 fullLockedDays,
        uint256 releaseTotalRounds,
        uint256 daysPerRound
    ) external onlyAdmin {
        require(beneficiary != address(0), "MOMA: Zero address");
        require(!_vestingList[beneficiary].isActive, "MOMA: Invalid vesting");
        VestingInfo memory info =
            VestingInfo(
                true,
                amount,
                block.timestamp,
                0,
                fullLockedDays,
                releaseTotalRounds,
                daysPerRound
            );
        _vestingList[beneficiary] = info;
    }

    function revokeVestingToken(address user) external onlyAdmin {
        require(_vestingList[user].isActive, "MOMA: Invalid beneficiary");
        uint256 claimableAmount = _getVestingClaimableAmount(user);
        require(totalSupply().add(claimableAmount) <= MAX_SUPPLY, "MOMA: Max supply exceeded");
        _vestingList[user].isActive = false;
        _mint(user, claimableAmount);
    }

    function getVestingInfoByUser(address user) external view returns (VestingInfo memory) {
        return _vestingList[user];
    }

    function _getVestingClaimableAmount(address user)
        internal
        view
        returns (uint256 claimableAmount)
    {
        if (!_vestingList[user].isActive) return 0;
        VestingInfo memory info = _vestingList[user];
        uint256 releaseTime = info.startTime.add(info.fullLockedDays.mul(1 days));
        if (block.timestamp < releaseTime) return 0;
        uint256 roundsPassed =
            (block.timestamp.sub(releaseTime)).div(1 days).div(info.daysPerRound);

        uint256 releasedAmount;
        if (roundsPassed >= info.releaseTotalRounds) {
            releasedAmount = info.amount;
        } else {
            releasedAmount = info.amount.mul(roundsPassed).div(info.releaseTotalRounds);
        }
        claimableAmount = 0;
        if (releasedAmount > info.claimedAmount) {
            claimableAmount = releasedAmount.sub(info.claimedAmount);
        }
    }

    function getVestingClaimableAmount(address user) external view returns (uint256) {
        return _getVestingClaimableAmount(user);
    }

    function claimVestingToken() external nonReentrant returns (uint256) {
        require(_vestingList[_msgSender()].isActive, "MOMA: Not in vesting list");
        uint256 claimableAmount = _getVestingClaimableAmount(_msgSender());
        require(claimableAmount > 0, "MOMA: Nothing to claim");
        require(totalSupply().add(claimableAmount) <= MAX_SUPPLY, "MOMA: Max supply exceeded");
        _vestingList[_msgSender()].claimedAmount = _vestingList[_msgSender()].claimedAmount.add(
            claimableAmount
        );
        _mint(_msgSender(), claimableAmount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        if (_blacklist[from].locked) {
            uint256 lockedBalance = remainLockedBalance(from);
            require(
                balanceOf(from).sub(amount) >= lockedBalance,
                "MOMA BLACKLIST: Cannot transfer locked balance"
            );
        }
    }

    function withdrawERC20(address token, uint256 amount) public onlyAdmin {
        require(amount > 0, "MOMA: Amount must be greater than 0");
        require(IERC20(token).balanceOf(address(this)) >= amount, "MOMA: ERC20 not enough balance");
        IERC20(token).transfer(_msgSender(), amount);
    }

    receive() external payable {
        revert();
    }
}
