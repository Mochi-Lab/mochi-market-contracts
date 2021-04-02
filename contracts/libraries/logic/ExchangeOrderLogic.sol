// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../types/DataTypes.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library ExchangeOrderLogic {
    using SafeMath for uint256;

    /**
     * @dev Create an exchange order object
     * @param exchangeId Id of exchange order
     * @param nftAddresses Addresses of source nft and destination nfts
     * @param tokenIds TokenIds of source nft and destination nfts
     * @param nftAmounts Amount of source nft and destination nfts
     * @param tokens Tokens that the seller wants to be paid for
     * @param prices Number of tokens that the seller wants to receive
     * @param users  Users address who participating in the exchange
     * @param times  The times of creating exchange order and exchange
     * @param datas Calldata that the seller wants to execute when receiving destination nft
     **/
    function newExchangeOrder(
        uint256 exchangeId,
        address[] memory nftAddresses,
        uint256[] memory tokenIds,
        uint256[] memory nftAmounts,
        address[] memory tokens,
        uint256[] memory prices,
        address[] memory users,
        uint256[] memory times,
        bytes[] memory datas
    ) internal pure returns (DataTypes.ExchangeOrder memory) {
        return
            DataTypes.ExchangeOrder({
                exchangeId: exchangeId,
                nftAddresses: nftAddresses,
                tokenIds: tokenIds,
                nftAmounts: nftAmounts,
                tokens: tokens,
                prices: prices,
                users: users,
                times: times,
                datas: datas,
                isActive: true,
                soldAmount: 0
            });
    }

    /**
     * @dev Add user and timestamp to exchange order object
     * @param exchangeOrder Exchange order object
     * @param time Time
     */
    function addTimestamp(
        DataTypes.ExchangeOrder storage exchangeOrder,
        uint256 time
    ) internal {
        exchangeOrder.times.push(time);
    }

    /**
     * @dev Deactive a exchange order
     * @param exchangeOrder exchange order object
     **/
    function deactive(DataTypes.ExchangeOrder storage exchangeOrder) internal {
        exchangeOrder.isActive = false;
    }

    /**
     * @dev Complete an exchange order
     * @param exchangeOrder exchange order object
     * @param buyer address of the person who closes the exchange order
     **/
    function complete(
        DataTypes.ExchangeOrder storage exchangeOrder,
        address buyer
    ) internal {
        exchangeOrder.isActive = false;
        exchangeOrder.times.push(block.timestamp);
        exchangeOrder.users.push(buyer);
    }
}
