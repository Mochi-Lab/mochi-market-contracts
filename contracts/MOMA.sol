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
        uint256 initAmount;
        uint256 claimedAmount;
        uint256 vestingDays;
        uint256 releaseFrom;
    }

    /** Initial supply includes
     * - private sale 5M
     * - public sale 1.5M
     * - DEX liquidity 1.5M
     */
    uint256 public constant INITIAL_SUPPLY = 8000000 * DECIMAL_MULTIPLIER;
    uint256 public constant MAX_SUPPLY = 100000000 * DECIMAL_MULTIPLIER;
    uint256 public constant DECIMAL_MULTIPLIER = 10**18;
    uint256 public constant BLACKLIST_LOCK_DURATION = 50 days;
    uint256 public constant BLACKLIST_EFFECTIVE_DURATION = 30 days;

    uint256 public blacklistEffectiveEndtime;

    mapping(address => BlacklistInfo) private _blacklist;
    mapping(address => VestingInfo) private _vestingList;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "MOMA: ADMIN role required");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "MOMA: MINTER role required");
        _;
    }

    constructor() public ERC20PresetMinterPauser("MOchi MArket", "MOMA") {
        blacklistEffectiveEndtime = block.timestamp + BLACKLIST_EFFECTIVE_DURATION;
        _mint(_msgSender(), INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) public virtual override onlyMinter {
        require(totalSupply().add(amount) <= MAX_SUPPLY, "MOMA: Max supply exceeded");
        _mint(to, amount);
    }

    function isBlocked(address user) external view returns (bool) {
        return _blacklist[user].locked;
    }

    function addToBlacklist(address user) external onlyAdmin {
        require(block.timestamp < blacklistEffectiveEndtime, "MOMA: Force lock time ended");
        _blacklist[user] = BlacklistInfo(true, block.timestamp, balanceOf(user));
    }

    function removeFromBlacklist(address user) external onlyAdmin {
        _blacklist[user].locked = false;
    }

    function addVestingToken(
        address recipient,
        uint256 amount,
        uint256 vestingDays,
        uint256 releaseFrom
    ) external onlyAdmin {
        require(recipient != address(0), "MOMA: Zero address");
        if (releaseFrom == 0) releaseFrom = block.timestamp;
        require(releaseFrom >= block.timestamp, "MOMA: Release time cannot be past time");
        require(
            _vestingList[recipient].initAmount == 0 &&
                _vestingList[recipient].vestingDays == 0 &&
                _vestingList[recipient].releaseFrom == 0,
            "MOMA: Invalid vesting"
        );
        _vestingList[recipient] = VestingInfo(amount, 0, vestingDays, releaseFrom);
    }

    function claimVestingToken() external nonReentrant returns (uint256) {
        uint256 claimableAmount = getVestingClaimableAmount(msg.sender);
        require(claimableAmount > 0, "MOMA: Nothing to claim");
        require(totalSupply().add(claimableAmount) <= MAX_SUPPLY, "MOMA: Max supply exceeded");
        _vestingList[msg.sender].claimedAmount = _vestingList[msg.sender].claimedAmount.add(
            claimableAmount
        );
        _mint(msg.sender, claimableAmount);
    }

    function getBlacklistByUser(address user) external view returns (BlacklistInfo memory) {
        return _blacklist[user];
    }

    function getVestingInfoByUser(address user) external view returns (VestingInfo memory) {
        return _vestingList[user];
    }

    function remainLockedBalance(address user) public view returns (uint256) {
        return _blacklist[user].initLockedBalance.sub(_getUnlockedBalance(user));
    }

    function getVestingClaimableAmount(address user) public view returns (uint256 claimableAmount) {
        VestingInfo memory info = _vestingList[user];
        if (block.timestamp < info.releaseFrom) return 0;
        uint256 releasedAmount;
        if (block.timestamp.sub(info.releaseFrom).add(1 days) >= info.vestingDays.mul(1 days)) {
            releasedAmount = info.initAmount;
        } else {
            releasedAmount = (block.timestamp.sub(info.releaseFrom).add(1 days))
                .mul(info.initAmount)
                .div(info.vestingDays.mul(1 days));
        }
        claimableAmount = 0;
        if (releasedAmount > info.claimedAmount) {
            claimableAmount = releasedAmount.sub(info.claimedAmount);
        }
    }

    function _getUnlockedBalance(address user) internal view returns (uint256 unlockedBalance) {
        BlacklistInfo memory info = _blacklist[user];
        unlockedBalance = info.initLockedBalance;
        if (
            info.locked == true &&
            block.timestamp >= info.lockedFrom &&
            block.timestamp.sub(info.lockedFrom) < BLACKLIST_LOCK_DURATION
        ) {
            unlockedBalance = (block.timestamp.sub(info.lockedFrom))
                .mul(info.initLockedBalance)
                .div(BLACKLIST_LOCK_DURATION);
        }
        return unlockedBalance;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        if (_blacklist[from].locked == true) {
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
        IERC20(token).transfer(msg.sender, amount);
    }

    receive() external payable {
        revert();
    }
}
