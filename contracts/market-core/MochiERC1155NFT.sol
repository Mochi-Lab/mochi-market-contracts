// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Mochi ERC1155 NFT Contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract MochiERC1155NFT is ERC1155 {
    using Counters for Counters.Counter;

    string public name;
    string public symbol;

    mapping(uint256 => string) private _tokenUri;

    Counters.Counter private _tokenIds;

    constructor() ERC1155("") {
        name = "Mochi Market NFT";
        symbol = "MOMANFT";
    }

    function mint(
        uint256 amount,
        string memory tokenUri,
        bytes memory data
    ) external returns (uint256){
        _tokenIds.increment();

        uint256 newTokenId = _tokenIds.current();

        _mint(_msgSender(), newTokenId, amount, data);
        _tokenUri[newTokenId] = tokenUri;

        return newTokenId;
    }

    function burn(uint256 id, uint256 amount) external {
        _burn(_msgSender(), id, amount);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _tokenUri[id];
    }

    function currentTokenId() external view returns(uint256) {
        return _tokenIds.current();
    }
}
