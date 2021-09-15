// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/helpers/ContextMixin.sol";
import "./BidStorage.sol";


contract Bid is Ownable, BidStorage {
    using SafeMath for uint256;
    using Address for address;
    constructor(address _owner, address _momaToken) Ownable() {
        transferOwnership(_owner);
        momaToken = ERC20Interface(_momaToken);
    }

    function placeBid(
        address _tokenAddress,
        uint256 _tokenId,
        address _tokenErc20,
        uint256 _price,
        uint256 _duration
    ) public {
        _placeBid(_tokenAddress, _tokenId, _tokenErc20, _price, _duration);
    }

    function _placeBid(
        address _tokenAddress,
        uint256 _tokenId,
        address _tokenErc20,
        uint256 _price,
        uint256 _duration
    ) private {
        // _requireERC721(_tokenAddress);
        address sender = _msgSender();

        require(_price > 0, "Price should be bigger than 0");

        _requireBidderBalance(sender, _price);

        require(
            _duration >= MIN_BID_DURATION,
            "The bid should be last longer than a minute"
        );

        require(
            _duration <= MAX_BID_DURATION,
            "The bid can not last longer than 6 months"
        );

        ERC721Interface token = ERC721Interface(_tokenAddress);
        address tokenOwner = token.ownerOf(_tokenId);
        require(
            tokenOwner != address(0) && tokenOwner != sender,
            "The token should have an owner different from the sender"
        );

        uint256 expiresAt = (block.timestamp).add(_duration);

        bytes32 bidId = keccak256(
            abi.encodePacked(
                block.timestamp,
                sender,
                _tokenAddress,
                _tokenId,
                _price,
                _duration
            )
        );

        uint256 bidIndex;

        if (_bidderHasABid(_tokenAddress, _tokenId, sender)) {
            bytes32 oldBidId;
            (bidIndex, oldBidId, , , ) = getBidByBidder(
                _tokenAddress,
                _tokenId,
                sender
            );

            // Delete old bid reference
            delete bidIndexByBidId[oldBidId];
        } else {
            // Use the bid counter to assign the index if there is not an active bid.
            bidIndex = bidCounterByToken[_tokenAddress][_tokenId];
            // Increase bid counter
            bidCounterByToken[_tokenAddress][_tokenId]++;
        }

        // Set bid references
        bidIdByTokenAndBidder[_tokenAddress][_tokenId][sender] = bidId;
        bidIndexByBidId[bidId] = bidIndex;

        // Save Bid
        _bidsByToken[_tokenAddress][_tokenId][bidIndex] = Bid({
            id: bidId,
            bidder: sender,
            tokenAddress: _tokenAddress,
            tokenId: _tokenId,
            tokenErc20: _tokenErc20,
            price: _price,
            expiresAt: expiresAt
        });

        emit BidCreated(
            bidId,
            _tokenAddress,
            _tokenId,
            sender,
            _tokenErc20,
            _price,
            expiresAt
        );
    }
    
    function acceptBid(
        address _tokenAddress,
        uint256 _tokenId,
        bytes memory _data
    ) public  returns (bytes4) {
        bytes32 bidId = _bytesToBytes32(_data);
        uint256 bidIndex = bidIndexByBidId[bidId];
        address sender = _msgSender();

        Bid memory bid = _getBid(_tokenAddress, _tokenId, bidIndex);

        // Check if the bid is valid.
        require(
            // solium-disable-next-line operator-whitespace
            bid.id == bidId && bid.expiresAt >= block.timestamp,
            "Invalid bid"
        );
        
        ERC721Interface token = ERC721Interface(_tokenAddress);
        address tokenOwner = token.ownerOf(_tokenId);
        require(
            tokenOwner != address(0) && tokenOwner == sender,
            "Sender should be owner of token"
        );

        address bidder = bid.bidder;
        uint256 price = bid.price;
        address tokenErc20 = bid.tokenErc20;


        // Check if bidder has funds
        _requireBidderBalance(bidder, price);

        // Delete bid references from contract storage
        delete _bidsByToken[_tokenAddress][_tokenId][bidIndex];
        delete bidIndexByBidId[bidId];
        delete bidIdByTokenAndBidder[_tokenAddress][_tokenId][bidder];

        // Reset bid counter to invalidate other bids placed for the token
        delete bidCounterByToken[_tokenAddress][_tokenId];

        // Transfer token to bidder
        ERC721Interface(_tokenAddress).transferFrom(
            address(this),
            bidder,
            _tokenId
        );

        uint256 saleShareAmount = 0;

        // Transfer ERC20 from bidder to seller
        require(
            ERC20Interface(tokenErc20).transferFrom(bidder, sender, price),
            'Transfering ERC20 to owner failed'
        );

        emit BidAccepted(
            bidId,
            msg.sender,
            _tokenId,
            bidder,
            sender,
            tokenErc20,
            price,
            saleShareAmount
        );

        return ERC721_Received;
    }
    
    function _bidderHasABid(
        address _tokenAddress,
        uint256 _tokenId,
        address _bidder
    ) internal view returns (bool) {
        bytes32 bidId = bidIdByTokenAndBidder[_tokenAddress][_tokenId][_bidder];
        uint256 bidIndex = bidIndexByBidId[bidId];
        // Bid index should be inside bounds
        if (bidIndex < bidCounterByToken[_tokenAddress][_tokenId]) {
            Bid memory bid = _bidsByToken[_tokenAddress][_tokenId][bidIndex];
            return bid.bidder == _bidder;
        }
        return false;
    }
    
    function getBidByBidder(
        address _tokenAddress,
        uint256 _tokenId,
        address _bidder
    )
        public
        view
        returns (
            uint256 bidIndex,
            bytes32 bidId,
            address bidder,
            uint256 price,
            uint256 expiresAt
        )
    {
        bidId = bidIdByTokenAndBidder[_tokenAddress][_tokenId][_bidder];
        bidIndex = bidIndexByBidId[bidId];
        (bidId, bidder, price, expiresAt) = getBidByToken(
            _tokenAddress,
            _tokenId,
            bidIndex
        );
        if (_bidder != bidder) {
            revert("Bidder has not an active bid for this token");
        }
    }

    function _requireBidderBalance(address _bidder, uint256 _amount)
        internal
        view
    {
        require(momaToken.balanceOf(_bidder) >= _amount, "Insufficient funds");
        require(
            momaToken.allowance(_bidder, address(this)) >= _amount,
            "The contract is not authorized to use MOMA on bidder behalf"
        );
    }
    
    function getBidByToken(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _index
    )
        public
        view
        returns (
            bytes32,
            address,
            uint256,
            uint256
        )
    {
        Bid memory bid = _getBid(_tokenAddress, _tokenId, _index);
        return (bid.id, bid.bidder, bid.price, bid.expiresAt);
    }

    function _getBid(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _index
    ) internal view returns (Bid memory) {
        require(
            _index < bidCounterByToken[_tokenAddress][_tokenId],
            "Invalid index"
        );
        return _bidsByToken[_tokenAddress][_tokenId][_index];
    }

    function _bytesToBytes32(bytes memory _data)
        internal
        pure
        returns (bytes32)
    {
        require(_data.length == 32, "The data should be 32 bytes length");

        bytes32 bidId;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            bidId := mload(add(_data, 0x20))
        }
        return bidId;
    }

    function cancelBid(address _tokenAddress, uint256 _tokenId)
        public
    {
        // Get active bid
        (uint256 bidIndex, bytes32 bidId, , , ) = getBidByBidder(
            _tokenAddress,
            _tokenId,
            msg.sender
        );

        _cancelBid(bidIndex, bidId, _tokenAddress, _tokenId, msg.sender);
    }
    
    function _cancelBid(
        uint256 _bidIndex,
        bytes32 _bidId,
        address _tokenAddress,
        uint256 _tokenId,
        address _bidder
    ) internal {
        // Delete bid references
        delete bidIndexByBidId[_bidId];
        delete bidIdByTokenAndBidder[_tokenAddress][_tokenId][_bidder];

        // Check if the bid is at the end of the mapping
        uint256 lastBidIndex = bidCounterByToken[_tokenAddress][_tokenId].sub(
            1
        );
        if (lastBidIndex != _bidIndex) {
            // Move last bid to the removed place
            Bid storage lastBid = _bidsByToken[_tokenAddress][_tokenId][
                lastBidIndex
            ];
            _bidsByToken[_tokenAddress][_tokenId][_bidIndex] = lastBid;
            bidIndexByBidId[lastBid.id] = _bidIndex;
        }

        // Delete empty index
        delete _bidsByToken[_tokenAddress][_tokenId][lastBidIndex];

        // Decrease bids counter
        bidCounterByToken[_tokenAddress][_tokenId]--;

        // emit BidCancelled event
        emit BidCancelled(_bidId, _tokenAddress, _tokenId, _bidder);
    }
}
