// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../types/SellOrderType.sol";

library SellOrderLogic {
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
    ) internal view returns (SellOrderType.SellOrder memory) {
        address[] memory emptyBuyers;
        uint256[] memory emptyBuyTimes;
        return
            SellOrderType.SellOrder({
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
    function deactive(SellOrderType.SellOrder storage sellOrder) internal {
        sellOrder.isActive = false;
    }

    /**
     * @dev Complete a sell order
     * @param sellOrder Sell order object
     * @param buyer Buyer address
     * @param amount The amount that buyer wants to buy
     **/
    function complete(
        SellOrderType.SellOrder storage sellOrder,
        address buyer,
        uint256 amount
    ) internal {
        sellOrder.buyTimes.push(block.timestamp);
        sellOrder.buyers.push(buyer);
        sellOrder.soldAmount = sellOrder.soldAmount + amount;
    }

    /**
     * @dev Update price of a sell order
     * @param sellOrder Sell order object
     * @param newPrice New price of the sell order
     **/
    function updatePrice(SellOrderType.SellOrder storage sellOrder, uint256 newPrice) internal {
        sellOrder.price = newPrice;
    }
}
