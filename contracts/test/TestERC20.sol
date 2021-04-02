// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestERC20 is ERC20, Ownable {
    constructor(string memory name_, string memory symbol_)
        public
        ERC20(name_, symbol_)
    {}

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }
}
