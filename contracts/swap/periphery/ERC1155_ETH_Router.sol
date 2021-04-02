// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./libraries/TransferHelper.sol";
import "./WrappedERC1155.sol";
import "./RootRouter.sol";
import "../factory/interfaces/IFactory.sol";

contract ERC1155_ETH_Router is ERC1155Receiver {
    using SafeMath for uint256;

    RootRouter public rootRouter;
    IFactory public factory;
    address public WETH;

    string public constant PARAMETERS_NOT_MATCH = "Parameters are not match";

    constructor(address payable _router) public {
        rootRouter = RootRouter(_router);
        factory = IFactory(rootRouter.factory());
        WETH = rootRouter.WETH();
    }

    receive() external payable {}

    struct AddLiquidity_NFT_ETH {
        address erc1155Address;
        uint256 tokenId;
        uint256 amountTokenDesired;
        uint256 amountTokenMin;
        uint256 amountETHMin;
        address to;
        uint256 deadline;
    }

    struct RemoveLiquidity_NFT_ETH {
        address erc1155Address;
        uint256 tokenId;
        uint256 amountTokenMin;
        uint256 liquidity;
        uint256 amountETHMin;
        address to;
        uint256 deadline;
        bytes data;
    }

    struct ExactETHForNFTs {
        uint256 amountOutMin;
        address[] erc1155Addresses;
        uint256[] tokenIds;
        address to;
        uint256 deadline;
        bytes data;
    }

    struct ExactNFTsForETH {
        uint256 amountIn;
        uint256 amountOutMin;
        address erc1155Address;
        uint256 tokenId;
        address to;
        uint256 deadline;
    }

    struct ETHForExactNFTs {
        uint256 amountOut;
        address[] erc1155Addresses;
        uint256[] tokenIds;
        address to;
        uint256 deadline;
        bytes data;
    }

    struct NFTsForExactETH {
        uint256 amountOut;
        uint256 amountInMax;
        address erc1155Address;
        uint256 tokenId;
        address to;
        uint256 deadline;
    }

    function addLiquidity_NFT_ETH(
        address erc1155Address,
        uint256 tokenId,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        virtual
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        (amountToken, amountETH, liquidity) = internalAddLiquidity_NFT_ETH(
            AddLiquidity_NFT_ETH({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                amountTokenDesired: amountTokenDesired,
                amountTokenMin: amountTokenMin,
                amountETHMin: amountETHMin,
                to: to,
                deadline: deadline
            })
        );
    }

    function internalAddLiquidity_NFT_ETH(AddLiquidity_NFT_ETH memory info)
        internal
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        IERC1155(info.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenId,
            info.amountTokenDesired,
            bytes("0x")
        );

        WrappedERC1155 wrappedToken =
            WrappedERC1155(_setupWrappedToken(info.erc1155Address, info.tokenId));

        wrappedToken.deposit(address(this), info.amountTokenDesired, bytes("0x"));

        (amountToken, amountETH, liquidity) = rootRouter.addLiquidityETH{value: info.amountETHMin}(
            address(wrappedToken),
            info.amountTokenDesired.mul(wrappedToken.unit()),
            info.amountTokenMin.mul(wrappedToken.unit()),
            info.amountETHMin,
            info.to,
            info.deadline
        );

        if (msg.value > amountETH) {
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
        }
    }

    function removeLiquidity_NFT_ETH(
        address erc1155Address,
        uint256 tokenId,
        uint256 amountTokenMin,
        uint256 liquidity,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bytes memory data
    ) public virtual returns (uint256 amountToken, uint256 amountETH) {
        (amountToken, amountETH) = internalRemoveLiquidity_NFT_ETH(
            RemoveLiquidity_NFT_ETH({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                amountTokenMin: amountTokenMin,
                liquidity: liquidity,
                amountETHMin: amountETHMin,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function internalRemoveLiquidity_NFT_ETH(RemoveLiquidity_NFT_ETH memory info)
        internal
        returns (uint256 amountToken, uint256 amountETH)
    {
        WrappedERC1155 wrappedToken =
            WrappedERC1155(factory.getWrappedERC1155(info.erc1155Address, info.tokenId));

        _redeemAndApprove(factory.getPair(address(wrappedToken), WETH), info.liquidity);

        (amountToken, amountETH) = rootRouter.removeLiquidityETH(
            address(wrappedToken),
            info.liquidity,
            info.amountTokenMin.mul(wrappedToken.unit()),
            info.amountETHMin,
            address(this),
            info.deadline
        );

        TransferHelper.safeTransferETH(info.to, amountETH);
        _pay(info.to, wrappedToken, amountToken, info.data);
    }

    function swapExactETHForNFTs(
        uint256 amountOutMin,
        address[] memory erc1155Addresses,
        uint256[] memory tokenIds,
        address to,
        uint256 deadline,
        bytes memory data
    ) external payable returns (uint256[] memory amounts) {
        amounts = _internalSwapExactETHForNFTs(
            ExactETHForNFTs({
                amountOutMin: amountOutMin,
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function _internalSwapExactETHForNFTs(ExactETHForNFTs memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](info.erc1155Addresses.length + 1);
        path[0] = WETH;
        for (uint256 i = 0; i < info.erc1155Addresses.length; i++) {
            path[i + 1] = factory.getWrappedERC1155(info.erc1155Addresses[i], info.tokenIds[i]);
        }
        uint256 realAmountOutMin =
            info.amountOutMin.mul(WrappedERC1155(path[path.length - 1]).unit());

        amounts = rootRouter.swapExactETHForTokens{value: msg.value}(
            realAmountOutMin,
            path,
            address(this),
            info.deadline
        );

        _pay(
            info.to,
            WrappedERC1155(path[path.length - 1]),
            amounts[amounts.length - 1],
            info.data
        );
    }

    function swapExactNFTsForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address erc1155Address,
        uint256 tokenId,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        amounts = _internalSwapExactNFTsForETH(
            ExactNFTsForETH({
                amountIn: amountIn,
                amountOutMin: amountOutMin,
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                to: to,
                deadline: deadline
            })
        );
    }

    function _internalSwapExactNFTsForETH(ExactNFTsForETH memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](2);
        path[0] = factory.getWrappedERC1155(info.erc1155Address, info.tokenId);
        path[1] = WETH;

        IERC1155(info.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenId,
            info.amountIn,
            bytes("0x")
        );

        uint256 realAmountIn =
            WrappedERC1155(path[0]).deposit(address(this), info.amountIn, bytes("0x"));

        amounts = rootRouter.swapExactTokensForETH(
            realAmountIn,
            info.amountOutMin,
            path,
            info.to,
            info.deadline
        );
    }

    function swapETHForExactNFTs(
        uint256 amountOut,
        address[] memory erc1155Addresses,
        uint256[] memory tokenIds,
        address to,
        uint256 deadline,
        bytes memory data
    ) external payable returns (uint256[] memory amounts) {
        amounts = _internalSwapETHForExactNFTs(
            ETHForExactNFTs({
                amountOut: amountOut,
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function _internalSwapETHForExactNFTs(ETHForExactNFTs memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](info.erc1155Addresses.length + 1);
        path[0] = WETH;
        for (uint256 i = 0; i < info.erc1155Addresses.length; i++) {
            path[i + 1] = factory.getWrappedERC1155(info.erc1155Addresses[i], info.tokenIds[i]);
        }

        uint256 realAmountOut = info.amountOut.mul(WrappedERC1155(path[path.length - 1]).unit());
        amounts = rootRouter.swapETHForExactTokens{value: msg.value}(
            realAmountOut,
            path,
            address(this),
            info.deadline
        );

        if (msg.value > amounts[0])
            TransferHelper.safeTransferETH(msg.sender, msg.value - amounts[0]);

        _pay(
            info.to,
            WrappedERC1155(path[path.length - 1]),
            amounts[amounts.length - 1],
            info.data
        );
    }

    function swapNFTsForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address erc1155Address,
        uint256 tokenId,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        amounts = _internalSwapNFTsForExactETH(
            NFTsForExactETH({
                amountOut: amountOut,
                amountInMax: amountInMax,
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                to: to,
                deadline: deadline
            })
        );
    }

    function _internalSwapNFTsForExactETH(NFTsForExactETH memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](2);
        path[0] = factory.getWrappedERC1155(info.erc1155Address, info.tokenId);
        path[1] = WETH;

        amounts = rootRouter.getAmountsIn(info.amountOut, path);

        uint256 amountNFT = 0;
        if (amounts[0].mod(WrappedERC1155(path[0]).unit()) > 0) {
            amountNFT = (amounts[0].div(WrappedERC1155(path[0]).unit())).add(1);
        } else {
            amountNFT = amounts[0].div(WrappedERC1155(path[0]).unit());
        }

        require(amountNFT <= info.amountInMax, "Router: EXCESSIVE_INPUT_AMOUNT");
        IERC1155(info.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenId,
            amountNFT,
            bytes("0x")
        );
        uint256 amountWrappedToken =
            WrappedERC1155(path[0]).deposit(address(this), amountNFT, bytes("0x"));

        amounts = rootRouter.swapTokensForExactETH(
            info.amountOut,
            amounts[0],
            path,
            info.to,
            info.deadline
        );
        WrappedERC1155(path[0]).transfer(msg.sender, amountWrappedToken.sub(amounts[0]));
    }

    function _redeemAndApprove(address pair, uint256 liquidity) internal {
        IERC20(pair).transferFrom(msg.sender, address(this), liquidity);
        IERC20(pair).approve(address(rootRouter), liquidity);
    }

    function _pay(
        address to,
        WrappedERC1155 wrappedToken,
        uint256 amountToken,
        bytes memory data
    ) internal {
        uint256 amountNFT = amountToken.div(wrappedToken.unit());
        uint256 tokenLeft = amountToken.sub(amountNFT.mul(wrappedToken.unit()));

        if (tokenLeft != 0) {
            TransferHelper.safeTransfer(address(wrappedToken), to, tokenLeft);
        }

        wrappedToken.withdraw(to, amountNFT, data);
    }

    function _setupWrappedToken(address erc1155Address, uint256 tokenId)
        internal
        returns (address wrappedToken)
    {
        if (factory.getWrappedERC1155(erc1155Address, tokenId) == address(0)) {
            wrappedToken = factory.createWrappedTokenForERC1155(erc1155Address, tokenId);
        } else {
            wrappedToken = factory.getWrappedERC1155(erc1155Address, tokenId);
        }

        WrappedERC1155(wrappedToken).approve(address(rootRouter), uint256(-1));

        if (IERC1155(erc1155Address).isApprovedForAll(address(this), wrappedToken) == false) {
            IERC1155(erc1155Address).setApprovalForAll(wrappedToken, true);
        }
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
