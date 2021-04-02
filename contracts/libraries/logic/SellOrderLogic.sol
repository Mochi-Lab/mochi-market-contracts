// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../types/DataTypes.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library SellOrderLogic {
    using SafeMath for uint256;

    /**
     * @dev Create a sell order object
     * @param sellId Id of sell order
     * @param nftAddress Nft Address
     * @param tokenId TokenId
     * @param amount The amount of nft the seller wants to sell
     * @param seller Seller address
     * @param price Number of tokens that the seller wants to receive
     * @param token Token that the seller wants to be paid for
     **/
    function newSellOrder(
        uint256 sellId,
        address nftAddress,
        uint256 tokenId,
        uint256 amount,
        address payable seller,
        uint256 price,
        address token
    ) internal view returns (DataTypes.SellOrder memory) {
        address[] memory emptyBuyers;
        uint256[] memory emptyBuyTimes;
        return
            DataTypes.SellOrder({
                sellId: sellId,
                nftAddress: nftAddress,
                tokenId: tokenId,
                amount: amount,
                soldAmount: 0,
                seller: seller,
                price: price,
                token: token,
                isActive: true,
                sellTime: block.timestamp,
                buyers: emptyBuyers,
                buyTimes: emptyBuyTimes
            });
    }

    /**
     * @dev Deactive a sell order
     * @param sellOrder Sell order object
     **/
    function deactive(DataTypes.SellOrder storage sellOrder) internal {
        sellOrder.isActive = false;
    }

    /**
     * @dev Complete a sell order
     * @param sellOrder Sell order object
     * @param buyer Buyer address
     * @param amount The amount that buyer wants to buy
     **/
    function complete(
        DataTypes.SellOrder storage sellOrder,
        address buyer,
        uint256 amount
    ) internal {
        sellOrder.buyTimes.push(block.timestamp);
        sellOrder.buyers.push(buyer);
        sellOrder.soldAmount = sellOrder.soldAmount.add(amount);
    }

    /**
     * @dev Update price of a sell order
     * @param sellOrder Sell order object
     * @param newPrice New price of the sell order
     **/
    function updatePrice(
        DataTypes.SellOrder storage sellOrder,
        uint256 newPrice
    ) internal {
        sellOrder.price = newPrice;
    }
}
