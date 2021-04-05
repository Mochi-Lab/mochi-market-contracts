// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "../libraries/helpers/Errors.sol";
import "../libraries/types/DataTypes.sol";
import "../interfaces/IAddressesProvider.sol";
import "../interfaces/INFTList.sol";
import "../interfaces/ISellOrderList.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IExchangeOrderList.sol";

/**
 * @title Market contract
 * - Owned by the MochiLab
 * @author MochiLab
 **/
contract Market is Initializable, ReentrancyGuard {
    using SafeMath for uint256;

    IAddressesProvider public addressesProvider;
    INFTList public nftList;
    ISellOrderList public sellOrderList;
    IVault public vault;
    IExchangeOrderList public exchangeOrderList;

    mapping(address => bool) public acceptedToken;
    uint256 internal feeNumerator;
    uint256 internal feeDenominator;
    uint256 internal constant SAFE_NUMBER = 1e12;

    event Initialized(address indexed provider, uint256 numerator, uint256 denominator);

    event FeeUpdated(uint256 numerator, uint256 denominator);

    modifier onlyMarketAdmin() {
        require(addressesProvider.getAdmin() == msg.sender, Errors.CALLER_NOT_MARKET_ADMIN);
        _;
    }

    /**
     * @dev Function is invoked by the proxy contract when the Market contract is added to the
     * AddressesProvider of the market.
     * - Caching the address of the AddressesProvider in order to reduce gas consumption
     *   on subsequent operations
     * @param provider The address of AddressesProvider
     * @param numerator The fee numerator
     * @param denominator The fee denominator
     **/
    function initialize(
        address provider,
        uint256 numerator,
        uint256 denominator
    ) external initializer {
        require(denominator >= numerator, Errors.DEMONINATOR_NOT_GREATER_THAN_NUMERATOR);
        addressesProvider = IAddressesProvider(provider);
        nftList = INFTList(addressesProvider.getNFTList());
        sellOrderList = ISellOrderList(addressesProvider.getSellOrderList());
        exchangeOrderList = IExchangeOrderList(addressesProvider.getExchangeOrderList());
        vault = IVault(addressesProvider.getVault());
        feeNumerator = numerator;
        feeDenominator = denominator;
        acceptedToken[address(0)] = true;
        emit Initialized(provider, numerator, denominator);
    }

    /**
     * @dev Accept a token as an exchange unit on the Market
     * - Can only be called by market admin
     * @param token Token address
     **/
    function acceptToken(address token) external onlyMarketAdmin {
        require(acceptedToken[token] == false, Errors.TOKEN_ALREADY_ACCEPTED);
        IERC20(token).approve(address(vault), uint256(-1));
        vault.setupRewardToken(token);
        acceptedToken[token] = true;
    }

    /**
     * @dev Revoke a token so it cannot be circulated on the Market
     * - Can only be called by market admin
     * @param token Token address
     **/
    function revokeToken(address token) external onlyMarketAdmin {
        require(acceptedToken[token] == true, Errors.TOKEN_ALREADY_REVOKED);
        IERC20(token).approve(address(vault), 0);
        acceptedToken[token] = false;
    }

    /**
     * @dev Update fee for transactions
     * - Can only be called by market admin
     * @param numerator The fee numerator
     * @param denominator The fee denominator
     **/
    function updateFee(uint256 numerator, uint256 denominator) external onlyMarketAdmin {
        require(denominator >= numerator, Errors.DEMONINATOR_NOT_GREATER_THAN_NUMERATOR);
        feeNumerator = numerator;
        feeDenominator = denominator;
        emit FeeUpdated(numerator, denominator);
    }

    /**
     * @dev Create a sell order
     * - Can be called at anyone
     * @param nftAddress The address of nft contract
     * @param tokenId The tokenId of nft
     * @param amount The amount of nft seller wants to sell
     * @param price The price offered by seller
     * @param token The token that seller wants to be paid for
     **/
    function createSellOrder(
        address nftAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        address token
    ) external nonReentrant {
        require(nftList.isAcceptedNFT(nftAddress), Errors.NFT_NOT_ACCEPTED);
        require(price > 0, Errors.PRICE_IS_ZERO);
        require(acceptedToken[token] == true, Errors.TOKEN_NOT_ACCEPTED);

        if (nftList.isERC1155(nftAddress) == true) {
            require(amount > 0, Errors.AMOUNT_IS_ZERO);
            require(
                IERC1155(nftAddress).balanceOf(msg.sender, tokenId) >= amount,
                Errors.INSUFFICIENT_BALANCE
            );
            require(
                IERC1155(nftAddress).isApprovedForAll(msg.sender, address(this)),
                Errors.NFT_NOT_APPROVED_FOR_MARKET
            );
            require(
                !sellOrderList.checkDuplicate_ERC1155(nftAddress, tokenId, msg.sender),
                Errors.SELL_ORDER_DUPLICATE
            );
        } else {
            require(amount == 1, Errors.AMOUNT_IS_NOT_EQUAL_ONE);
            require(
                IERC721(nftAddress).ownerOf(tokenId) == msg.sender,
                Errors.CALLER_NOT_NFT_OWNER
            );
            require(
                IERC721(nftAddress).getApproved(tokenId) == address(this),
                Errors.NFT_NOT_APPROVED_FOR_MARKET
            );
            require(
                !sellOrderList.checkDuplicate_ERC721(nftAddress, tokenId, msg.sender),
                Errors.SELL_ORDER_DUPLICATE
            );
        }
        sellOrderList.addSellOrder(nftAddress, tokenId, amount, msg.sender, price, token);
    }

    /**
     * @dev Cancle a sell order
     * - Can only be called by seller
     * @param sellId Sell order id
     **/
    function cancleSellOrder(uint256 sellId) external nonReentrant {
        DataTypes.SellOrder memory sellOrder = sellOrderList.getSellOrderById(sellId);
        require(sellOrder.seller == msg.sender, Errors.CALLER_NOT_SELLER);
        require(sellOrder.isActive == true, Errors.SELL_ORDER_NOT_ACTIVE);
        sellOrderList.deactiveSellOrder(sellId);
    }

    /**
     * @dev Buy 1 nft through the respective sell order
     * -  Can be called at anyone
     * @param sellId Sell order id
     * @param amount The amount buyer wants to buy
     **/
    function buy(
        uint256 sellId,
        uint256 amount,
        address receiver,
        bytes calldata data
    ) external payable nonReentrant {
        DataTypes.SellOrder memory sellOrder = sellOrderList.getSellOrderById(sellId);

        require(sellOrder.seller != msg.sender, Errors.CALLER_IS_SELLER);
        require(sellOrder.isActive == true, Errors.SELL_ORDER_NOT_ACTIVE);

        require(amount > 0, Errors.AMOUNT_IS_ZERO);
        require(amount <= sellOrder.amount.sub(sellOrder.soldAmount), Errors.AMOUNT_IS_NOT_ENOUGH);
        uint256 price = amount.mul(sellOrder.price);
        uint256 fee = calculateFee(price);

        if (sellOrder.token == address(0)) {
            require(msg.value == price, Errors.VALUE_NOT_EQUAL_PRICE);
            sellOrder.seller.transfer(price.sub(fee));
            if (fee > 0) {
                vault.deposit{value: fee}(
                    sellOrder.nftAddress,
                    sellOrder.seller,
                    msg.sender,
                    sellOrder.token,
                    fee
                );
            }
        } else {
            IERC20(sellOrder.token).transferFrom(msg.sender, address(this), price);
            IERC20(sellOrder.token).transfer(sellOrder.seller, price.sub(fee));
            if (fee > 0) {
                vault.deposit(
                    sellOrder.nftAddress,
                    sellOrder.seller,
                    msg.sender,
                    sellOrder.token,
                    fee
                );
            }
        }

        if (nftList.isERC1155(sellOrder.nftAddress) == true) {
            IERC1155(sellOrder.nftAddress).safeTransferFrom(
                sellOrder.seller,
                receiver,
                sellOrder.tokenId,
                amount,
                data
            );
        } else {
            IERC721(sellOrder.nftAddress).safeTransferFrom(
                sellOrder.seller,
                receiver,
                sellOrder.tokenId
            );
        }

        sellOrderList.completeSellOrder(sellId, msg.sender, amount);
    }

    /**
     * @dev Update price of a sell order
     * - Can only be called by seller
     * @param id Sell order id
     * @param newPrice The new price of sell order
     **/
    function updatePrice(uint256 id, uint256 newPrice) external nonReentrant {
        DataTypes.SellOrder memory sellOrder = sellOrderList.getSellOrderById(id);
        require(sellOrder.seller == msg.sender, Errors.CALLER_NOT_SELLER);
        require(sellOrder.isActive == true, Errors.SELL_ORDER_NOT_ACTIVE);
        require(sellOrder.price != newPrice, Errors.PRICE_NOT_CHANGE);

        sellOrderList.updatePrice(id, newPrice);
    }

    /**
     * @dev Create an exchange order
     * - Can be called at anyone
     * @param nftAddresses The addresses of source nft and destination nft
     * @param tokenIds The tokenIds of source nft and destination nft
     * @param nftAmounts The amount of source nft and destination nft
     * @param tokens The token that seller wants to be paid for
     * @param prices The price that seller wants
     * @param users Users address
     * @param data Calldata that seller wants to execute when he receives destination nft
     **/
    function createExchangeOrder(
        address[] memory nftAddresses,
        uint256[] memory tokenIds,
        uint256[] memory nftAmounts,
        address[] memory tokens,
        uint256[] memory prices,
        address[] memory users,
        bytes[] memory data
    ) external nonReentrant {
        require(
            nftAddresses.length == tokenIds.length &&
                tokenIds.length == nftAmounts.length &&
                nftAmounts.length == tokens.length &&
                tokens.length == prices.length &&
                prices.length == data.length,
            Errors.PARAMETERS_NOT_MATCH
        );
        require(msg.sender == users[0], Errors.PARAMETERS_NOT_MATCH);

        require(data[0].length == 0, Errors.INVALID_CALLDATA);

        for (uint256 i = 0; i < nftAddresses.length; i++) {
            require(nftList.isAcceptedNFT(nftAddresses[i]), Errors.NFT_NOT_ACCEPTED);
            if (nftList.isERC1155(nftAddresses[i]) == true) {
                require(nftAmounts[i] > 0, Errors.AMOUNT_IS_ZERO);
            } else {
                require(nftAmounts[i] == 1, Errors.AMOUNT_IS_NOT_EQUAL_ONE);
            }
            if (i > 0 && prices[i] > 0) {
                require(acceptedToken[tokens[i]] == true, Errors.TOKEN_NOT_ACCEPTED);
            }
        }
        if (nftList.isERC1155(nftAddresses[0]) == true) {
            require(
                IERC1155(nftAddresses[0]).balanceOf(msg.sender, tokenIds[0]) >= nftAmounts[0],
                Errors.INSUFFICIENT_BALANCE
            );
            require(
                IERC1155(nftAddresses[0]).isApprovedForAll(msg.sender, address(this)),
                Errors.NFT_NOT_APPROVED_FOR_MARKET
            );
            require(
                !exchangeOrderList.checkDuplicate_ERC1155(
                    nftAddresses[0],
                    tokenIds[0],
                    msg.sender
                ),
                Errors.EXCHANGE_ORDER_DUPLICATE
            );
        } else {
            require(
                IERC721(nftAddresses[0]).ownerOf(tokenIds[0]) == msg.sender,
                Errors.CALLER_NOT_NFT_OWNER
            );
            require(
                IERC721(nftAddresses[0]).getApproved(tokenIds[0]) == address(this),
                Errors.NFT_NOT_APPROVED_FOR_MARKET
            );
            require(
                !exchangeOrderList.checkDuplicate_ERC721(nftAddresses[0], tokenIds[0], msg.sender),
                Errors.EXCHANGE_ORDER_DUPLICATE
            );
        }

        exchangeOrderList.addExchangeOrder(
            nftAddresses,
            tokenIds,
            nftAmounts,
            tokens,
            prices,
            users,
            data
        );
    }

    /**
     * @dev Cancle an exchange order
     * - Can only be called by seller
     * @param exchangeId Exchange order id
     **/
    function cancleExchangeOrder(uint256 exchangeId) external nonReentrant {
        DataTypes.ExchangeOrder memory exchangeOrder =
            exchangeOrderList.getExchangeOrderById(exchangeId);
        require(exchangeOrder.users[0] == msg.sender, Errors.CALLER_NOT_SELLER);
        require(exchangeOrder.isActive == true, Errors.SELL_ORDER_NOT_ACTIVE);
        exchangeOrderList.deactiveExchangeOrder(exchangeId);
    }

    /**
     * @dev Purchase an exchange order
     * -  Can be called at anyone
     * @param exchangeId Exchange order id
     * @param data Calldata that buyer wants to execute upon receiving the nft
     **/
    function exchange(
        uint256 exchangeId,
        uint256 destinationId,
        address receiver,
        bytes memory data
    ) external payable nonReentrant {
        DataTypes.ExchangeOrder memory exchangeOrder =
            exchangeOrderList.getExchangeOrderById(exchangeId);
        require(exchangeOrder.users[0] != msg.sender, Errors.CALLER_IS_SELLER);
        require(exchangeOrder.isActive == true, Errors.SELL_ORDER_NOT_ACTIVE);
        require(
            destinationId > 0 && destinationId < exchangeOrder.nftAddresses.length,
            Errors.INVALID_DESTINATION
        );
        if (nftList.isERC1155(exchangeOrder.nftAddresses[destinationId]) == true) {
            require(
                IERC1155(exchangeOrder.nftAddresses[destinationId]).balanceOf(
                    msg.sender,
                    exchangeOrder.tokenIds[destinationId]
                ) >= exchangeOrder.nftAmounts[destinationId],
                Errors.INSUFFICIENT_BALANCE
            );
            require(
                IERC1155(exchangeOrder.nftAddresses[destinationId]).isApprovedForAll(
                    msg.sender,
                    address(this)
                ),
                Errors.NFT_NOT_APPROVED_FOR_MARKET
            );
            IERC1155(exchangeOrder.nftAddresses[destinationId]).safeTransferFrom(
                msg.sender,
                exchangeOrder.users[0],
                exchangeOrder.tokenIds[destinationId],
                exchangeOrder.nftAmounts[destinationId],
                exchangeOrder.data[destinationId]
            );
        } else {
            require(
                IERC721(exchangeOrder.nftAddresses[destinationId]).getApproved(
                    exchangeOrder.tokenIds[destinationId]
                ) == address(this),
                Errors.NFT_NOT_APPROVED_FOR_MARKET
            );
            require(
                IERC721(exchangeOrder.nftAddresses[destinationId]).ownerOf(
                    exchangeOrder.tokenIds[destinationId]
                ) == msg.sender,
                Errors.CALLER_NOT_NFT_OWNER
            );
            IERC721(exchangeOrder.nftAddresses[destinationId]).safeTransferFrom(
                msg.sender,
                exchangeOrder.users[0],
                exchangeOrder.tokenIds[destinationId]
            );
        }
        if (nftList.isERC1155(exchangeOrder.nftAddresses[0]) == true) {
            IERC1155(exchangeOrder.nftAddresses[0]).safeTransferFrom(
                exchangeOrder.users[0],
                receiver,
                exchangeOrder.tokenIds[0],
                exchangeOrder.nftAmounts[0],
                data
            );
        } else {
            IERC721(exchangeOrder.nftAddresses[0]).safeTransferFrom(
                exchangeOrder.users[0],
                receiver,
                exchangeOrder.tokenIds[0]
            );
        }
        uint256 fee = calculateFee(exchangeOrder.prices[destinationId]);
        if (exchangeOrder.tokens[destinationId] == address(0)) {
            require(
                msg.value == exchangeOrder.prices[destinationId],
                Errors.VALUE_NOT_EQUAL_PRICE
            );
            payable(exchangeOrder.users[0]).transfer(exchangeOrder.prices[destinationId].sub(fee));
            if (fee > 0) {
                vault.deposit{value: fee}(
                    exchangeOrder.nftAddresses[0],
                    exchangeOrder.users[0],
                    msg.sender,
                    exchangeOrder.tokens[destinationId],
                    fee
                );
            }
        } else {
            IERC20(exchangeOrder.tokens[destinationId]).transferFrom(
                msg.sender,
                address(this),
                exchangeOrder.prices[destinationId]
            );
            IERC20(exchangeOrder.tokens[destinationId]).transfer(
                exchangeOrder.users[0],
                exchangeOrder.prices[destinationId].sub(fee)
            );
            if (fee > 0) {
                vault.deposit(
                    exchangeOrder.nftAddresses[0],
                    exchangeOrder.users[0],
                    msg.sender,
                    exchangeOrder.tokens[destinationId],
                    fee
                );
            }
        }
        exchangeOrderList.completeExchangeOrder(exchangeId, destinationId, msg.sender);
    }

    /**
     * @dev Get fee
     * - external view function
     * @return Fee numerator and denominator
     **/
    function getFee() external view returns (uint256, uint256) {
        return (feeNumerator, feeDenominator);
    }

    /**
     * @dev Calculate fee
     * - internal view function, called inside buy(), exchange() function
     * @param price The price of transaction
     * @return Fee of transaction
     **/
    function calculateFee(uint256 price) internal view returns (uint256) {
        uint256 fee = ((price * SAFE_NUMBER * feeNumerator) / feeDenominator) / SAFE_NUMBER;
        return fee;
    }
}
