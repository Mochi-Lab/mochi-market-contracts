// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./libraries/TransferHelper.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./WrappedERC1155.sol";
import "./Router.sol";
import "../factory/interfaces/IFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NFTRouter is ERC1155Receiver {
    using SafeMath for uint256;

    Router public router;
    IFactory public factory;
    address public WETH;
    mapping(address => mapping(uint256 => address)) public wrappedERC1155;
    mapping(address => address) public wrapedERC721;

    constructor(address payable router_) public {
        router = Router(router_);
        factory = IFactory(router.factory());
        WETH = router.WETH();
    }

    receive() external payable {}

    struct AddERC1155Input {
        address erc1155Address;
        uint256 tokenId;
        uint256 amountTokenDesired;
        uint256 amountTokenMin;
        bytes data;
    }

    struct RemoveERC1155Input {
        address erc1155Address;
        uint256 tokenId;
        uint256 amountTokenMin;
        bytes data;
    }
    struct AddERC20Input {
        address erc20Address;
        uint256 amountTokenDesired;
        uint256 amountTokenMin;
    }

    struct RemoveERC20Input {
        address erc20Address;
        uint256 amountTokenMin;
    }

    function addLiquidity_NFT_ETH(
        address erc1155Address,
        uint256 tokenId,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable virtual {
        internalAddLiquidity_NFT_ETH(
            AddERC1155Input({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                amountTokenDesired: amountTokenDesired,
                amountTokenMin: amountTokenMin,
                data: bytes("0x")
            }),
            amountETHMin,
            to,
            deadline
        );
    }

    function internalAddLiquidity_NFT_ETH(
        AddERC1155Input memory token,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) internal {
        IERC1155(token.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            token.tokenId,
            token.amountTokenDesired,
            token.data
        );

        if (wrappedERC1155[token.erc1155Address][token.tokenId] == address(0)) {
            _setUpNewWrappedToken(token.erc1155Address, token.tokenId);
        }

        WrappedERC1155 wrappedToken =
            WrappedERC1155(wrappedERC1155[token.erc1155Address][token.tokenId]);
        wrappedToken.deposit(
            address(this),
            token.amountTokenDesired,
            token.data
        );

        (, uint256 amountETH, ) =
            router.addLiquidityETH{value: amountETHMin}(
                address(wrappedToken),
                token.amountTokenDesired.mul(wrappedToken.unit()),
                token.amountTokenMin.mul(wrappedToken.unit()),
                amountETHMin,
                to,
                deadline
            );

        if (msg.value > amountETH) {
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
        }
    }

    function addLiquidity_NFT_NFT(
        address erc1155Address_A,
        uint256 tokenId_A,
        uint256 amountDesired_A,
        uint256 amountMin_A,
        address erc1155Address_B,
        uint256 tokenId_B,
        uint256 amountDesired_B,
        uint256 amountMin_B,
        address to,
        uint256 deadline
    ) external virtual {
        internalAddLiquidity_NFT_NFT(
            AddERC1155Input({
                erc1155Address: erc1155Address_A,
                tokenId: tokenId_A,
                amountTokenDesired: amountDesired_A,
                amountTokenMin: amountMin_A,
                data: bytes("0x")
            }),
            AddERC1155Input({
                erc1155Address: erc1155Address_B,
                tokenId: tokenId_B,
                amountTokenDesired: amountDesired_B,
                amountTokenMin: amountMin_B,
                data: bytes("0x")
            }),
            to,
            deadline
        );
    }

    function internalAddLiquidity_NFT_NFT(
        AddERC1155Input memory token_A,
        AddERC1155Input memory token_B,
        address to,
        uint256 deadline
    ) internal {
        IERC1155(token_A.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            token_A.tokenId,
            token_A.amountTokenDesired,
            token_A.data
        );

        IERC1155(token_B.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            token_B.tokenId,
            token_B.amountTokenDesired,
            token_B.data
        );

        if (
            wrappedERC1155[token_A.erc1155Address][token_A.tokenId] ==
            address(0)
        ) {
            _setUpNewWrappedToken(token_A.erc1155Address, token_A.tokenId);
        }

        if (
            wrappedERC1155[token_B.erc1155Address][token_B.tokenId] ==
            address(0)
        ) {
            _setUpNewWrappedToken(token_B.erc1155Address, token_B.tokenId);
        }

        WrappedERC1155 wrappedToken_A =
            WrappedERC1155(
                wrappedERC1155[token_A.erc1155Address][token_A.tokenId]
            );
        wrappedToken_A.deposit(
            address(this),
            token_A.amountTokenDesired,
            token_A.data
        );

        WrappedERC1155 wrappedToken_B =
            WrappedERC1155(
                wrappedERC1155[token_B.erc1155Address][token_B.tokenId]
            );
        wrappedToken_B.deposit(
            address(this),
            token_B.amountTokenDesired,
            token_B.data
        );

        router.addLiquidity(
            address(wrappedToken_A),
            address(wrappedToken_B),
            token_A.amountTokenDesired.mul(wrappedToken_A.unit()),
            token_B.amountTokenDesired.mul(wrappedToken_B.unit()),
            token_A.amountTokenMin.mul(wrappedToken_A.unit()),
            token_B.amountTokenMin.mul(wrappedToken_B.unit()),
            to,
            deadline
        );
    }

    function removeLiquidity_NFT_ETH(
        address erc1155Address,
        uint256 tokenId,
        uint256 amountTokenMin,
        uint256 liquidity,
        uint256 amountETHMin,
        address to,
        uint256 deadline // returns (uint256 amountToken, uint256 amountETH)
    ) public virtual {
        internalRemoveLiquidity_NFT_ETH(
            RemoveERC1155Input({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                amountTokenMin: amountTokenMin,
                data: bytes("0x")
            }),
            liquidity,
            amountETHMin,
            to,
            deadline
        );
    }

    function internalRemoveLiquidity_NFT_ETH(
        RemoveERC1155Input memory token,
        uint256 liquidity,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) internal {
        redeemAndApporve(
            factory.getPair(
                wrappedERC1155[token.erc1155Address][token.tokenId],
                WETH
            ),
            liquidity
        );

        WrappedERC1155 wrappedToken =
            WrappedERC1155(wrappedERC1155[token.erc1155Address][token.tokenId]);

        (uint256 amountToken, uint256 amountETH) =
            router.removeLiquidityETH(
                address(wrappedToken),
                liquidity,
                token.amountTokenMin.mul(wrappedToken.unit()),
                amountETHMin,
                address(this),
                deadline
            );

        TransferHelper.safeTransferETH(to, amountETH);
        pay(to, wrappedToken, amountToken, token.data);
    }

    function removeLiquidity_NFT_NFT(
        address erc1155Address_A,
        uint256 tokenId_A,
        uint256 amountTokenMin_A,
        address erc1155Address_B,
        uint256 tokenId_B,
        uint256 amountTokenMin_B,
        uint256 liquidity,
        address to,
        uint256 deadline // returns (uint256 amountToken, uint256 amountETH)
    ) public virtual {
        interalRemoveLiquidity_NFT_NFT(
            RemoveERC1155Input({
                erc1155Address: erc1155Address_A,
                tokenId: tokenId_A,
                amountTokenMin: amountTokenMin_A,
                data: bytes("0x")
            }),
            RemoveERC1155Input({
                erc1155Address: erc1155Address_B,
                tokenId: tokenId_B,
                amountTokenMin: amountTokenMin_B,
                data: bytes("0x")
            }),
            liquidity,
            to,
            deadline
        );
    }

    function interalRemoveLiquidity_NFT_NFT(
        RemoveERC1155Input memory token_A,
        RemoveERC1155Input memory token_B,
        uint256 liquidity,
        address to,
        uint256 deadline
    ) internal {
        redeemAndApporve(
            factory.getPair(
                wrappedERC1155[token_A.erc1155Address][token_A.tokenId],
                wrappedERC1155[token_B.erc1155Address][token_B.tokenId]
            ),
            liquidity
        );

        WrappedERC1155 wrappedToken_A =
            WrappedERC1155(
                wrappedERC1155[token_A.erc1155Address][token_A.tokenId]
            );
        WrappedERC1155 wrappedToken_B =
            WrappedERC1155(
                wrappedERC1155[token_B.erc1155Address][token_B.tokenId]
            );
        (uint256 amountToken_A, uint256 amountToken_B) =
            router.removeLiquidity(
                address(wrappedToken_A),
                address(wrappedToken_B),
                liquidity,
                token_A.amountTokenMin.mul(wrappedToken_A.unit()),
                token_B.amountTokenMin.mul(wrappedToken_B.unit()),
                address(this),
                deadline
            );

        pay(to, wrappedToken_A, amountToken_A, token_A.data);
        pay(to, wrappedToken_B, amountToken_B, token_B.data);
    }

    function addLiquidity_NFT_Token(
        address erc1155Address,
        uint256 tokenId,
        uint256 erc1155AmountDesired,
        uint256 erc1155AmountTokenMin,
        address erc20Address,
        uint256 erc20AmountTokenDesired,
        uint256 erc20AmountTokenMin,
        address to,
        uint256 deadline
    ) public {
        internalAddLiquidity_NFT_Token(
            AddERC1155Input({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                amountTokenMin: erc1155AmountTokenMin,
                amountTokenDesired: erc1155AmountDesired,
                data: bytes("0x")
            }),
            AddERC20Input({
                erc20Address: erc20Address,
                amountTokenMin: erc20AmountTokenMin,
                amountTokenDesired: erc20AmountTokenDesired
            }),
            to,
            deadline
        );
    }

    function internalAddLiquidity_NFT_Token(
        AddERC1155Input memory erc1155Token,
        AddERC20Input memory erc20Token,
        address to,
        uint256 deadline
    ) internal {
        IERC1155(erc1155Token.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            erc1155Token.tokenId,
            erc1155Token.amountTokenDesired,
            erc1155Token.data
        );

        if (
            wrappedERC1155[erc1155Token.erc1155Address][erc1155Token.tokenId] ==
            address(0)
        ) {
            _setUpNewWrappedToken(
                erc1155Token.erc1155Address,
                erc1155Token.tokenId
            );
        }

        IERC20(erc20Token.erc20Address).transferFrom(
            msg.sender,
            address(this),
            erc20Token.amountTokenDesired
        );
        IERC20(erc20Token.erc20Address).approve(
            address(router),
            erc20Token.amountTokenDesired
        );

        WrappedERC1155 wrappedToken =
            WrappedERC1155(
                wrappedERC1155[erc1155Token.erc1155Address][
                    erc1155Token.tokenId
                ]
            );
        wrappedToken.deposit(
            address(this),
            erc1155Token.amountTokenDesired,
            erc1155Token.data
        );

        router.addLiquidity(
            address(wrappedToken),
            erc20Token.erc20Address,
            erc1155Token.amountTokenDesired.mul(wrappedToken.unit()),
            erc20Token.amountTokenDesired,
            erc1155Token.amountTokenMin.mul(wrappedToken.unit()),
            erc20Token.amountTokenMin,
            to,
            deadline
        );
    }

    function removeLiquidity_NFT_Token(
        address erc1155Address,
        uint256 tokenId,
        uint256 erc1155AmountTokenMin,
        address erc20Address,
        uint256 erc20AmountTokenMin,
        uint256 liquidity,
        address to,
        uint256 deadline
    ) public {
        internalRemoveLiquidity_NFT_Token(
            RemoveERC1155Input({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                amountTokenMin: erc1155AmountTokenMin,
                data: bytes("0x")
            }),
            RemoveERC20Input({
                erc20Address: erc20Address,
                amountTokenMin: erc20AmountTokenMin
            }),
            liquidity,
            to,
            deadline
        );
    }

    function internalRemoveLiquidity_NFT_Token(
        RemoveERC1155Input memory erc1155Token,
        RemoveERC20Input memory erc20Token,
        uint256 liquidity,
        address to,
        uint256 deadline
    ) public {
        redeemAndApporve(
            factory.getPair(
                wrappedERC1155[erc1155Token.erc1155Address][
                    erc1155Token.tokenId
                ],
                erc20Token.erc20Address
            ),
            liquidity
        );

        WrappedERC1155 wrappedToken =
            WrappedERC1155(
                wrappedERC1155[erc1155Token.erc1155Address][
                    erc1155Token.tokenId
                ]
            );
        (uint256 amountToken_A, uint256 amountToken_B) =
            router.removeLiquidity(
                address(wrappedToken),
                erc20Token.erc20Address,
                liquidity,
                erc1155Token.amountTokenMin.mul(wrappedToken.unit()),
                erc20Token.amountTokenMin,
                address(this),
                deadline
            );

        pay(to, wrappedToken, amountToken_A, erc1155Token.data);
        IERC20(erc20Token.erc20Address).transfer(msg.sender, amountToken_B);
    }

    function redeemAndApporve(address pair, uint256 liquidity) internal {
        IERC20(pair).transferFrom(msg.sender, address(this), liquidity);
        IERC20(pair).approve(address(router), liquidity);
    }

    function pay(
        address to,
        WrappedERC1155 wrappedToken,
        uint256 amountToken,
        bytes memory data
    ) internal {
        if (amountToken.mod(wrappedToken.unit()) != 0) {
            TransferHelper.safeTransfer(
                address(wrappedToken),
                to,
                amountToken.mod(wrappedToken.unit())
            );
        }

        wrappedToken.withdraw(to, amountToken.div(wrappedToken.unit()), data);
    }

    function _setUpNewWrappedToken(address erc1155Address, uint256 tokenId)
        internal
        returns (address)
    {
        WrappedERC1155 wrappedToken =
            new WrappedERC1155(erc1155Address, tokenId);
        wrappedERC1155[erc1155Address][tokenId] = address(wrappedToken);
        IERC1155 erc1155 = IERC1155(erc1155Address);
        erc1155.setApprovalForAll(address(wrappedToken), true);
        wrappedToken.approve(address(router), uint256(-1));
        return wrappedERC1155[erc1155Address][tokenId];
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return
            bytes4(
                keccak256(
                    "onERC1155Received(address,address,uint256,uint256,bytes)"
                )
            );
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return
            bytes4(
                keccak256(
                    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"
                )
            );
    }
}
