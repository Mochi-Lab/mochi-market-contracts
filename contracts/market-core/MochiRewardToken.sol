// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../libraries/helpers/Errors.sol";

contract MochiRewardToken is ERC20, Ownable {
    using SafeMath for uint256;
    uint256 public constant MAX_SUPPLY = 1e26;

    modifier supplyIsAvailable(uint256 amount) {
        require(
            totalSupply().add(amount) <= MAX_SUPPLY,
            Errors.SUPPLY_IS_NOT_AVAILABLE
        );
        _;
    }

    constructor(string memory name, string memory symbol)
        public
        ERC20(name, symbol)
    {}

    function mint(address account, uint256 amount)
        external
        onlyOwner
        supplyIsAvailable(amount)
    {
        _mint(account, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
