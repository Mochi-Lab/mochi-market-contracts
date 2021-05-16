// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MOMATestnet is ERC20 {
    mapping(address => uint256) public userToTimestamp;

    modifier notSpam() {
        require(block.timestamp - userToTimestamp[msg.sender] >= 300, "SPAM"); // 5 minutes
        _;
    }

    constructor() ERC20("MOchi MArket Token", "MOMA") {}

    function mint() external notSpam {
        userToTimestamp[msg.sender] = block.timestamp;
        _mint(msg.sender, 30 ether);
    }
}
