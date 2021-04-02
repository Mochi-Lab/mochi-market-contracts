// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";

contract WrappedERC1155 is ERC20, ERC1155Receiver {
    using SafeMath for uint256;
    using Strings for uint256;

    address public erc1155;
    uint256 public tokenId;
    uint256 public unit = 1e18;

    constructor(address _erc1155, uint256 _tokenId)
        public
        ERC1155Receiver()
        ERC20(
            string(
                abi.encodePacked(
                    "Wrapped ERC1155: ",
                    ERC1155(_erc1155).uri(0),
                    " - TokenId: ",
                    _tokenId.toString()
                )
            ),
            string(
                abi.encodePacked("WERC1155-", ERC1155(_erc1155).uri(0), "-", _tokenId.toString())
            )
        )
    {
        erc1155 = _erc1155;
        tokenId = _tokenId;
    }

    function deposit(
        address to,
        uint256 amount,
        bytes memory data
    ) public returns (uint256) {
        ERC1155(erc1155).safeTransferFrom(msg.sender, address(this), tokenId, amount, data);

        uint256 amountMint = amount.mul(unit);
        _mint(to, amountMint);

        return amountMint;
    }

    function withdraw(
        address to,
        uint256 amount,
        bytes memory data
    ) public {
        ERC1155(erc1155).safeTransferFrom(address(this), to, tokenId, amount, data);

        _burn(msg.sender, amount.mul(unit));
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return
            bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }
}
