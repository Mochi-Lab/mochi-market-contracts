// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../types/NFTInfoType.sol";

library NFTInfoLogic {
    /**
     * @dev Register a nft address so it can buy, sell, exchange on Market
     * @param nftInfo NftInfo object
     * @param id NftInfo id
     * @param nftAddress Nft address
     * @param isERC1155 Is that nft erc1155 or not?
     **/
    function register(
        NFTInfoType.NFTInfo storage nftInfo,
        uint256 id,
        address nftAddress,
        bool isERC1155
    ) internal {
        nftInfo.id = id;
        nftInfo.nftAddress = nftAddress;
        nftInfo.isERC1155 = isERC1155;
        nftInfo.isRegistered = true;
        nftInfo.isAccepted = false;
    }

    /**
     * @dev Admin accepts a nft address so it can trade in the market
     * @param nftInfo nftInfo object
     **/
    function accept(NFTInfoType.NFTInfo storage nftInfo) internal {
        nftInfo.isAccepted = true;
    }

    /**
     * @dev Admin revokdes a nft address
     * @param nftInfo nftInfo object
     **/
    function revoke(NFTInfoType.NFTInfo storage nftInfo) internal {
        nftInfo.isAccepted = false;
    }
}
