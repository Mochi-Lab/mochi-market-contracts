// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

contract WrappedERC721 is ERC20, Initializable {
    using SafeMath for uint256;
    using Strings for uint256;

    address public erc721;
    uint256 public tokenId;
    uint256 public unit = 1 ether;

    constructor(address _erc721, uint256 _tokenId)
        public
        ERC20(
            string(
                abi.encodePacked(
                    "Wrapped ERC721 For ",
                    ERC721(_erc721).name(),
                    " - TokenId: ",
                    _tokenId.toString()
                )
            ),
            string(
                abi.encodePacked(
                    "WERC721-",
                    ERC721(_erc721).symbol(),
                    "-",
                    _tokenId.toString()
                )
            )
        )
    {
        erc721 = _erc721;
        tokenId = _tokenId;
    }

    function deposit() public {
        ERC721(erc721).safeTransferFrom(msg.sender, address(this), tokenId);
        _mint(msg.sender, unit);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
            );
    }
}
