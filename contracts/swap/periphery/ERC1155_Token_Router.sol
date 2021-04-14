// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./libraries/TransferHelper.sol";
import "./WrappedERC1155.sol";
import "./RootRouter.sol";
import "../factory/interfaces/IFactory.sol";

contract ERC1155_Token_Router {
    RootRouter public rootRouter;
    IFactory public factory;
    address public WETH;

    string public constant PARAMETERS_NOT_MATCH = "Parameters are not match";

    constructor(address payable _router) {
        rootRouter = RootRouter(_router);
        factory = IFactory(rootRouter.factory());
        WETH = rootRouter.WETH();
    }

    receive() external payable {}

    struct AddLiquidity_NFT_Token {
        address erc1155Address;
        uint256 tokenId;
        uint256 erc1155AmountDesired;
        uint256 erc1155AmountTokenMin;
        address erc20Address;
        uint256 erc20AmountTokenDesired;
        uint256 erc20AmountTokenMin;
        address to;
        uint256 deadline;
    }

    struct RemoveLiquidity_NFT_Token {
        address erc1155Address;
        uint256 tokenId;
        uint256 erc1155AmountTokenMin;
        address erc20Address;
        uint256 erc20AmountTokenMin;
        uint256 liquidity;
        address to;
        uint256 deadline;
        bytes data;
    }

    struct ExactTokensForNFTs {
        uint256 amountIn;
        uint256 amountOutMin;
        address token;
        address[] erc1155Addresses;
        uint256[] tokenIds;
        address to;
        uint256 deadline;
        bytes data;
    }

    struct ExactNFTsForTokens {
        uint256 amountIn;
        uint256 amountOutMin;
        address erc1155Address;
        uint256 tokenId;
        address[] erc20Addresses;
        address to;
        uint256 deadline;
    }

    struct TokensForExactNFTs {
        uint256 amountOut;
        uint256 amountInMax;
        address erc20Address;
        address[] erc1155Addresses;
        uint256[] tokenIds;
        address to;
        uint256 deadline;
        bytes data;
    }

    struct NFTsForExactTokens {
        uint256 amountOut;
        uint256 amountInMax;
        address erc1155Address;
        uint256 tokenId;
        address[] erc20Addresses;
        address to;
        uint256 deadline;
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
    ) public returns (uint256 liquidity) {
        liquidity = _internalAddLiquidity_NFT_Token(
            AddLiquidity_NFT_Token({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                erc1155AmountDesired: erc1155AmountDesired,
                erc1155AmountTokenMin: erc1155AmountTokenMin,
                erc20Address: erc20Address,
                erc20AmountTokenDesired: erc20AmountTokenDesired,
                erc20AmountTokenMin: erc20AmountTokenMin,
                to: to,
                deadline: deadline
            })
        );
    }

    function _internalAddLiquidity_NFT_Token(AddLiquidity_NFT_Token memory info)
        internal
        returns (uint256 liquidity)
    {
        IERC1155(info.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenId,
            info.erc1155AmountDesired,
            bytes("0x")
        );

        WrappedERC1155 wrappedToken =
            WrappedERC1155(
                _setupWrappedToken(info.erc1155Address, info.tokenId, info.erc20Address)
            );

        IERC20(info.erc20Address).transferFrom(
            msg.sender,
            address(this),
            info.erc20AmountTokenDesired
        );

        wrappedToken.deposit(address(this), info.erc1155AmountDesired, bytes("0x"));

        (, , liquidity) = rootRouter.addLiquidity(
            address(wrappedToken),
            info.erc20Address,
            info.erc1155AmountDesired * wrappedToken.unit(),
            info.erc20AmountTokenDesired,
            info.erc1155AmountTokenMin * wrappedToken.unit(),
            info.erc20AmountTokenMin,
            info.to,
            info.deadline
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
        uint256 deadline,
        bytes memory data
    ) public returns (uint256 amountTokenA, uint256 amountTokenB) {
        (amountTokenA, amountTokenB) = _internalRemoveLiquidity_NFT_Token(
            RemoveLiquidity_NFT_Token({
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                erc1155AmountTokenMin: erc1155AmountTokenMin,
                erc20Address: erc20Address,
                erc20AmountTokenMin: erc20AmountTokenMin,
                liquidity: liquidity,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function _internalRemoveLiquidity_NFT_Token(RemoveLiquidity_NFT_Token memory info)
        internal
        returns (uint256 amountTokenA, uint256 amountTokenB)
    {
        WrappedERC1155 wrappedToken =
            WrappedERC1155(factory.getWrappedERC1155(info.erc1155Address, info.tokenId));

        _redeemAndApprove(
            factory.getPair(address(wrappedToken), info.erc20Address),
            info.liquidity
        );

        (amountTokenA, amountTokenB) = rootRouter.removeLiquidity(
            address(wrappedToken),
            info.erc20Address,
            info.liquidity,
            info.erc1155AmountTokenMin * wrappedToken.unit(),
            info.erc20AmountTokenMin,
            address(this),
            info.deadline
        );

        _pay(info.to, wrappedToken, amountTokenA, info.data);
        IERC20(info.erc20Address).transfer(info.to, amountTokenB);
    }

    function swapExactTokensForNFTs(
        uint256 amountIn,
        uint256 amountOutMin,
        address token,
        address[] calldata erc1155Addresses,
        uint256[] memory tokenIds,
        address to,
        uint256 deadline,
        bytes memory data
    ) external returns (uint256[] memory amounts) {
        require(erc1155Addresses.length == tokenIds.length, PARAMETERS_NOT_MATCH);
        amounts = _internalSwapExactTokensForNFTs(
            ExactTokensForNFTs({
                amountIn: amountIn,
                amountOutMin: amountOutMin,
                token: token,
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function _internalSwapExactTokensForNFTs(ExactTokensForNFTs memory info)
        internal
        returns (uint256[] memory amounts)
    {
        IERC20(info.token).transferFrom(msg.sender, address(this), info.amountIn);
        address[] memory path = new address[](info.erc1155Addresses.length + 1);
        path[0] = info.token;
        for (uint256 i = 0; i < info.erc1155Addresses.length; i++) {
            path[i + 1] = factory.getWrappedERC1155(info.erc1155Addresses[i], info.tokenIds[i]);
        }
        uint256 realAmountOutMin = info.amountOutMin * WrappedERC1155(path[path.length - 1]).unit();
        amounts = rootRouter.swapExactTokensForTokens(
            info.amountIn,
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

    function swapExactNFTsForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address erc1155Address,
        uint256 tokenId,
        address[] calldata erc20Addresses,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        amounts = _internalSwapExactNFTsForTokens(
            ExactNFTsForTokens({
                amountIn: amountIn,
                amountOutMin: amountOutMin,
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                erc20Addresses: erc20Addresses,
                to: to,
                deadline: deadline
            })
        );
    }

    function _internalSwapExactNFTsForTokens(ExactNFTsForTokens memory info)
        internal
        returns (uint256[] memory amounts)
    {
        IERC1155(info.erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenId,
            info.amountIn,
            bytes("0x")
        );

        address wrappedTokenAddress = factory.getWrappedERC1155(info.erc1155Address, info.tokenId);

        uint256 amountIn =
            WrappedERC1155(wrappedTokenAddress).deposit(address(this), info.amountIn, bytes("0x"));

        address[] memory path = new address[](info.erc20Addresses.length + 1);
        path[0] = wrappedTokenAddress;

        for (uint256 i = 0; i < info.erc20Addresses.length; i++) {
            path[i + 1] = info.erc20Addresses[i];
        }

        amounts = rootRouter.swapExactTokensForTokens(
            amountIn,
            info.amountOutMin,
            path,
            info.to,
            info.deadline
        );
    }

    function swapTokensForExactNFTs(
        uint256 amountOut,
        uint256 amountInMax,
        address erc20Address,
        address[] memory erc1155Addresses,
        uint256[] memory tokenIds,
        address to,
        uint256 deadline,
        bytes memory data
    ) external returns (uint256[] memory amounts) {
        amounts = _internalSwapTokensForExactNFTs(
            TokensForExactNFTs({
                amountOut: amountOut,
                amountInMax: amountInMax,
                erc20Address: erc20Address,
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function _internalSwapTokensForExactNFTs(TokensForExactNFTs memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](info.erc1155Addresses.length + 1);
        path[0] = info.erc20Address;

        for (uint256 i = 0; i < info.erc1155Addresses.length; i++) {
            path[i + 1] = factory.getWrappedERC1155(info.erc1155Addresses[i], info.tokenIds[i]);
        }

        uint256 realAmountOut = info.amountOut * WrappedERC1155(path[path.length - 1]).unit();

        amounts = rootRouter.getAmountsIn(realAmountOut, path);
        IERC20(info.erc20Address).transferFrom(msg.sender, address(this), amounts[0]);

        amounts = rootRouter.swapTokensForExactTokens(
            realAmountOut,
            info.amountInMax,
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

    function swapNFTsForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address erc1155Address,
        uint256 tokenId,
        address[] memory erc20Addresses,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        amounts = _internalSwapNFTsForExactTokens(
            NFTsForExactTokens({
                amountOut: amountOut,
                amountInMax: amountInMax,
                erc1155Address: erc1155Address,
                tokenId: tokenId,
                erc20Addresses: erc20Addresses,
                to: to,
                deadline: deadline
            })
        );
    }

    function _internalSwapNFTsForExactTokens(NFTsForExactTokens memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](info.erc20Addresses.length + 1);
        path[0] = factory.getWrappedERC1155(info.erc1155Address, info.tokenId);

        for (uint256 i = 0; i < info.erc20Addresses.length; i++) {
            path[i + 1] = info.erc20Addresses[i];
        }

        amounts = rootRouter.getAmountsIn(info.amountOut, path);

        uint256 amountNFT = 0;

        if (amounts[0] % WrappedERC1155(path[0]).unit() > 0) {
            amountNFT = amounts[0] / WrappedERC1155(path[0]).unit() + 1;
        } else {
            amountNFT = amounts[0] / WrappedERC1155(path[0]).unit();
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

        amounts = rootRouter.swapTokensForExactTokens(
            info.amountOut,
            info.amountInMax * WrappedERC1155(path[0]).unit(),
            path,
            info.to,
            info.deadline
        );

        WrappedERC1155(path[0]).transfer(msg.sender, amountWrappedToken - amounts[0]);
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
        uint256 amountNFT = amountToken / wrappedToken.unit();
        uint256 tokenLeft = amountToken - (amountNFT * wrappedToken.unit());

        if (tokenLeft != 0) {
            TransferHelper.safeTransfer(address(wrappedToken), to, tokenLeft);
        }

        wrappedToken.withdraw(to, amountNFT, data);
    }

    function _setupWrappedToken(
        address erc1155Address,
        uint256 tokenId,
        address erc20Address
    ) internal returns (address wrappedToken) {
        IERC20(erc20Address).approve(address(rootRouter), type(uint256).max);

        if (factory.getWrappedERC1155(erc1155Address, tokenId) == address(0)) {
            wrappedToken = factory.createWrappedTokenForERC1155(erc1155Address, tokenId);
        } else {
            wrappedToken = factory.getWrappedERC1155(erc1155Address, tokenId);
        }

        WrappedERC1155(wrappedToken).approve(address(rootRouter), type(uint256).max);

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
    ) external returns (bytes4) {
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4) {
        return
            bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }
}
