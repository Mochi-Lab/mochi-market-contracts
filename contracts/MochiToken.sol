// SPDX-License-Identifier:GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MOCHI is ERC20PresetMinterPauser, ReentrancyGuard {
    uint256 public constant INITIAL_SUPPLY = 59000000 * DECIMAL_MULTIPLIER;
    uint256 public constant MAX_SUPPLY = 100000000 * DECIMAL_MULTIPLIER;
    uint256 public constant DECIMAL_MULTIPLIER = 10**18;
    uint256 public constant BLACKLIST_LOCK_DURATION = 50 days;

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

    mapping(address => BlacklistInfo) private blacklist;
    mapping(address => VestingInfo) private vestingList;

    uint256 public blacklistEffectiveEndtime;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "MOCHI: ADMIN role required");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "MOCHI: MINTER role required");
        _;
    }

    constructor() public ERC20PresetMinterPauser("MOCHI", "MOCHI") {
        blacklistEffectiveEndtime = block.timestamp + 30 days;
        _mint(_msgSender(), INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) public virtual override onlyMinter {
        require(totalSupply().add(amount) <= MAX_SUPPLY, "MOCHI: Max supply exceeded");
        _mint(to, amount);
    }

    function isBlocked(address user) external view returns (bool) {
        return blacklist[user].locked;
    }

    function addToBlacklist(address user) external onlyAdmin {
        require(block.timestamp < blacklistEffectiveEndtime, "MOCHI: Force lock time ended");
        blacklist[user] = BlacklistInfo(true, block.timestamp, balanceOf(user));
    }

    function removeFromBlacklist(address user) external onlyAdmin {
        blacklist[user].locked = false;
    }

    function addVestingToken(
        address recipient,
        uint256 amount,
        uint256 vestingDays,
        uint256 releaseFrom
    ) external onlyAdmin {
        require(recipient != address(0), "MOCHI: Zero address");
        if (releaseFrom == 0) releaseFrom = block.timestamp;
        require(releaseFrom >= block.timestamp, "MOCHI: Release time cannot be past time");
        require(
            vestingList[recipient].initAmount == 0 &&
                vestingList[recipient].vestingDays == 0 &&
                vestingList[recipient].releaseFrom == 0,
            "MOCHI: Invalid vesting"
        );
        vestingList[recipient] = VestingInfo(amount, 0, vestingDays, releaseFrom);
    }

    function claimVestingToken() external nonReentrant returns (uint256) {
        uint256 claimableAmount = getVestingClaimableAmount(msg.sender);
        require(claimableAmount > 0, "MOCHI: Nothing to claim");
        require(totalSupply().add(claimableAmount) <= MAX_SUPPLY, "MOCHI: Max supply exceeded");
        vestingList[msg.sender].claimedAmount = vestingList[msg.sender].claimedAmount.add(
            claimableAmount
        );
        _mint(msg.sender, claimableAmount);
    }

    function getBlacklistByUser(address user) external view returns (BlacklistInfo memory) {
        return blacklist[user];
    }

    function getVestingInfoByUser(address user) external view returns (VestingInfo memory) {
        return vestingList[user];
    }

    function withdrawERC20(address token, uint256 amount) public onlyAdmin {
        require(amount > 0, "MOCHI: amount must be greater than 0");
        require(
            IERC20(token).balanceOf(address(this)) >= amount,
            "MOCHI: ERC20 not enough balance"
        );
        IERC20(token).transfer(msg.sender, amount);
    }

    function remainLockedBalance(address user) public view returns (uint256) {
        return blacklist[user].initLockedBalance.sub(_getUnlockedBalance(user));
    }

    function _getUnlockedBalance(address user) internal view returns (uint256 unlockedBalance) {
        BlacklistInfo memory info = blacklist[user];
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

    function getVestingClaimableAmount(address user)
        public
        view
        returns (uint256 claimableAmount)
    {
        VestingInfo memory info = vestingList[user];
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

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (blacklist[from].locked == true) {
            uint256 lockedBalance = remainLockedBalance(from);
            require(
                balanceOf(from).sub(amount) >= lockedBalance,
                "MOCHI BLACKLIST: Cannot transfer locked balance"
            );
        }
        super._beforeTokenTransfer(from, to, amount);
    }

    receive() external payable {
        revert();
    }
}
