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

contract ERC1155_ERC1155_Router {
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

    struct AddLiquidity_NFT_NFT {
        address[] erc1155Addresses;
        uint256[] tokenIds;
        uint256[] amountDesireds;
        uint256[] amountMins;
        address to;
        uint256 deadline;
    }

    struct RemoveLiquidity_NFT_NFT {
        address[] erc1155Addresses;
        uint256[] tokenIds;
        uint256[] amountTokenMins;
        bytes[] data;
        uint256 liquidity;
        address to;
        uint256 deadline;
    }

    struct ExactNFTsForNFTs {
        uint256 amountIn;
        uint256 amountOutMin;
        address[] erc1155Addresses;
        uint256[] tokenIds;
        address to;
        uint256 deadline;
        bytes data;
    }

    struct NFTsForExactNFTs {
        uint256 amountOut;
        uint256 amountInMax;
        address[] erc1155Addresses;
        uint256[] tokenIds;
        address to;
        uint256 deadline;
        bytes data;
    }

    function addLiquidity_NFT_NFT(
        address[] memory erc1155Addresses,
        uint256[] memory tokenIds,
        uint256[] memory amountDesireds,
        uint256[] memory amountMins,
        address to,
        uint256 deadline
    )
        external
        virtual
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        (amountA, amountB, liquidity) = internalAddLiquidity_NFT_NFT(
            AddLiquidity_NFT_NFT({
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                amountDesireds: amountDesireds,
                amountMins: amountMins,
                to: to,
                deadline: deadline
            })
        );
    }

    function internalAddLiquidity_NFT_NFT(AddLiquidity_NFT_NFT memory info)
        internal
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        IERC1155(info.erc1155Addresses[0]).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenIds[0],
            info.amountDesireds[0],
            bytes("0x")
        );

        IERC1155(info.erc1155Addresses[1]).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenIds[1],
            info.amountDesireds[1],
            bytes("0x")
        );

        WrappedERC1155 wrappedTokenA =
            WrappedERC1155(_setupWrappedToken(info.erc1155Addresses[0], info.tokenIds[0]));

        WrappedERC1155 wrappedTokenB =
            WrappedERC1155(_setupWrappedToken(info.erc1155Addresses[1], info.tokenIds[1]));

        wrappedTokenA.deposit(address(this), info.amountDesireds[0], bytes("0x"));

        wrappedTokenB.deposit(address(this), info.amountDesireds[1], bytes("0x"));

        (amountA, amountB, liquidity) = rootRouter.addLiquidity(
            address(wrappedTokenA),
            address(wrappedTokenB),
            info.amountDesireds[0] * wrappedTokenA.unit(),
            info.amountDesireds[1] * wrappedTokenA.unit(),
            info.amountMins[0] * wrappedTokenA.unit(),
            info.amountMins[1] * wrappedTokenB.unit(),
            info.to,
            info.deadline
        );
    }

    function removeLiquidity_NFT_NFT(
        address[] memory erc1155Addresses,
        uint256[] memory tokenIds,
        uint256[] memory amountTokenMins,
        bytes[] memory data,
        uint256 liquidity,
        address to,
        uint256 deadline
    ) public virtual returns (uint256 amountA, uint256 amountB) {
        require(
            erc1155Addresses.length == tokenIds.length &&
                tokenIds.length == amountTokenMins.length &&
                amountTokenMins.length == data.length,
            PARAMETERS_NOT_MATCH
        );
        (amountA, amountB) = _internalRemoveLiquidity_NFT_NFT(
            RemoveLiquidity_NFT_NFT({
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                amountTokenMins: amountTokenMins,
                data: data,
                liquidity: liquidity,
                to: to,
                deadline: deadline
            })
        );
    }

    function _internalRemoveLiquidity_NFT_NFT(RemoveLiquidity_NFT_NFT memory info)
        internal
        returns (uint256 amountA, uint256 amountB)
    {
        WrappedERC1155 wrappedTokenA =
            WrappedERC1155(factory.getWrappedERC1155(info.erc1155Addresses[0], info.tokenIds[0]));
        WrappedERC1155 wrappedTokenB =
            WrappedERC1155(factory.getWrappedERC1155(info.erc1155Addresses[1], info.tokenIds[1]));

        _redeemAndApprove(
            factory.getPair(address(wrappedTokenA), address(wrappedTokenB)),
            info.liquidity
        );

        (amountA, amountB) = rootRouter.removeLiquidity(
            address(wrappedTokenA),
            address(wrappedTokenB),
            info.liquidity,
            info.amountTokenMins[0] * wrappedTokenA.unit(),
            info.amountTokenMins[1] * wrappedTokenB.unit(),
            address(this),
            info.deadline
        );

        _pay(info.to, wrappedTokenA, amountA, info.data[0]);
        _pay(info.to, wrappedTokenB, amountB, info.data[1]);
    }

    function swapExactNFTsForNFTs(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory erc1155Addresses,
        uint256[] memory tokenIds,
        address to,
        uint256 deadline,
        bytes memory data
    ) external returns (uint256[] memory amounts) {
        amounts = _internalSwapExactNFTsForNFTs(
            ExactNFTsForNFTs({
                amountIn: amountIn,
                amountOutMin: amountOutMin,
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function _internalSwapExactNFTsForNFTs(ExactNFTsForNFTs memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](info.erc1155Addresses.length);
        for (uint256 i = 0; i < info.erc1155Addresses.length; i++) {
            path[i] = factory.getWrappedERC1155(info.erc1155Addresses[i], info.tokenIds[i]);
        }

        IERC1155(info.erc1155Addresses[0]).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenIds[0],
            info.amountIn,
            bytes("0x")
        );

        uint256 realAmountIn =
            WrappedERC1155(path[0]).deposit(address(this), info.amountIn, bytes("0x"));

        uint256 realAmountOutMin = info.amountOutMin * WrappedERC1155(path[path.length - 1]).unit();

        amounts = rootRouter.swapExactTokensForTokens(
            realAmountIn,
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

    function swapNFTsForExactNFTs(
        uint256 amountOut,
        uint256 amountInMax,
        address[] memory erc1155Addresses,
        uint256[] memory tokenIds,
        address to,
        uint256 deadline,
        bytes memory data
    ) external returns (uint256[] memory amounts) {
        amounts = _internalSwapNFTsForExactNFTs(
            NFTsForExactNFTs({
                amountOut: amountOut,
                amountInMax: amountInMax,
                erc1155Addresses: erc1155Addresses,
                tokenIds: tokenIds,
                to: to,
                deadline: deadline,
                data: data
            })
        );
    }

    function _internalSwapNFTsForExactNFTs(NFTsForExactNFTs memory info)
        internal
        returns (uint256[] memory amounts)
    {
        address[] memory path = new address[](info.erc1155Addresses.length);
        for (uint256 i = 0; i < info.erc1155Addresses.length; i++) {
            path[i] = factory.getWrappedERC1155(info.erc1155Addresses[i], info.tokenIds[i]);
        }

        uint256 realAmountOut = info.amountOut * WrappedERC1155(path[path.length - 1]).unit();

        amounts = rootRouter.getAmountsIn(realAmountOut, path);

        uint256 amountNFT = 0;
        if (amounts[0] % WrappedERC1155(path[0]).unit() > 0) {
            amountNFT = (amounts[0] / WrappedERC1155(path[0]).unit()) + 1;
        } else {
            amountNFT = amounts[0] / WrappedERC1155(path[0]).unit();
        }

        require(amountNFT <= info.amountInMax, "Router: EXCESSIVE_INPUT_AMOUNT");
        IERC1155(info.erc1155Addresses[0]).safeTransferFrom(
            msg.sender,
            address(this),
            info.tokenIds[0],
            amountNFT,
            bytes("0x")
        );
        uint256 amountWrappedToken =
            WrappedERC1155(path[0]).deposit(address(this), amountNFT, bytes("0x"));

        amounts = rootRouter.swapTokensForExactTokens(
            realAmountOut,
            amounts[0],
            path,
            address(this),
            info.deadline
        );

        WrappedERC1155(path[0]).transfer(msg.sender, amountWrappedToken - amounts[0]);

        _pay(
            info.to,
            WrappedERC1155(path[path.length - 1]),
            amounts[amounts.length - 1],
            info.data
        );
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

    function _setupWrappedToken(address erc1155Address, uint256 tokenId)
        internal
        returns (address wrappedToken)
    {
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
