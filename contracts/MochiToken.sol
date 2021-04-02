// SPDX-License-Identifier:GPL-3.0
pragma solidity 0.6.12;

import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

contract MOCHI is ERC20PresetMinterPauser {
    uint256 public constant INITIAL_SUPPLY = 500000 * DECIMAL_MULTIPLIER;
    uint256 public constant MAX_SUPPLY = 100000000 * DECIMAL_MULTIPLIER;
    uint256 public constant DECIMAL_MULTIPLIER = 10**18;
    uint256 public constant BLACKLIST_LOCK_DURATION = 432200; // 432200 blocks ~ 50 days

    struct BlacklistInfo {
        bool locked;
        uint256 lockedFrom;
        uint256 initLockedBalance;
    }

    mapping(address => BlacklistInfo) public blacklist;
    uint256 public blacklistIneffectiveTime;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "MOCHI: ADMIN role required");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "MOCHI: MINTER role required");
        _;
    }

    constructor() public ERC20PresetMinterPauser("MOCHI", "MOCHI") {
        blacklistIneffectiveTime = block.number + 30 * 8640; // 30 days from deploy
        _mint(_msgSender(), INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) public virtual override onlyMinter {
        require(totalSupply().add(amount) <= MAX_SUPPLY, "MOCHI: max supply exceeded");
        _mint(to, amount);
    }

    function isBlocked(address user) public view returns (bool) {
        return blacklist[user].locked;
    }

    function addToBlacklist(address user) public onlyAdmin {
        require(block.number < blacklistIneffectiveTime, "MOCHI: Force lock time ended");
        blacklist[user] = BlacklistInfo(true, block.number, balanceOf(user));
    }

    function removeFromBlacklist(address user) public onlyAdmin {
        blacklist[user].locked = false;
    }

    function checkUnlockedBalance(address user) public view returns (uint256) {
        BlacklistInfo memory info = blacklist[user];

        uint256 unlockedBalance;
        if (block.number - info.lockedFrom <= BLACKLIST_LOCK_DURATION) {
            unlockedBalance = (block.number - info.lockedFrom).mul(info.initLockedBalance).div(
                BLACKLIST_LOCK_DURATION
            );
        } else {
            unlockedBalance = info.initLockedBalance;
        }
        return unlockedBalance;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (isBlocked(from) == true) {
            BlacklistInfo memory info = blacklist[from];
            uint256 unlockBalance = checkUnlockedBalance(from);
            uint256 lockedBalance = info.initLockedBalance.sub(unlockBalance);
            require(
                balanceOf(from).sub(lockedBalance) >= amount,
                "MOCHI BLACKLIST: cannot transfer locked balance"
            );
        }
        super._beforeTokenTransfer(from, to, amount);
    }
}
