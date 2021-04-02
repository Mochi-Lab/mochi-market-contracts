// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../libraries/helpers/ArrayLib.sol";

/**
 * @title NFTCampaign contract
 * @author MochiLab
 **/
contract NFTCampaign is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using ArrayLib for uint256[];

    // Campaign status 0: Init, 1: Running, 2: Paused, 3: Ended
    struct Campaign {
        uint256 campaignId;
        address nftAddress;
        address tokenAddress;
        uint256 remainSlots;
        uint256 amountPerSlot;
        uint256 startTime;
        uint256 endTime;
        address campaignOwner;
        uint256 status;
        string infoURL;
    }

    Campaign[] private _campaigns;

    uint256[] private _waitlist;

    // campaignId => tokenid => status
    mapping(uint256 => mapping(uint256 => bool)) private _claimStatus;

    // owner => campaignId[]
    mapping(address => uint256[]) private _ownedCampaigns;

    // nft address => campaignId[]
    mapping(address => uint256[]) private _nftToCampaigns;

    modifier validCampaignId(uint256 campaignId) {
        require(campaignId < _campaigns.length, "Invalid campaignId");
        _;
    }

    event CampaignAdded(
        uint256 campaignId,
        address indexed nftAddress,
        address indexed tokenAddress,
        uint256 remainSlots,
        uint256 amountPerSlot,
        uint256 startTime,
        uint256 endTime,
        address indexed campaignOwner,
        string infoURL
    );

    event CampaignAccepted(uint256 campaignId);

    event Claimed(
        uint256 campaignId,
        uint256[] tokenIds,
        uint256 totalAmount,
        address indexed claimer,
        address indexed receiver
    );

    event EmergencyWithdraw(uint256 campaignId, uint256 amount);
    event PauseCampaign(uint256 campaignId);
    event ResumeCampaign(uint256 campaignId);
    event ForceEndCampaign(uint256 campaignId);

    constructor() public {}

    /**
     * @dev Register a new campaign
     * - Can be called by anyone
     * @param nftAddress The NFT address for the campaign
     * @param tokenAddress The token to be airdrop
     * @param totalSlots The total slots which can receive airdrop
     * @param amountPerSlot Amount of tokens each slot can claim
     * @param startTime Campaign start time
     * @param endTime Campaign end time
     * @return campaignId The id of added campaign
     */
    function registerCampaign(
        address nftAddress,
        address tokenAddress,
        uint256 totalSlots,
        uint256 amountPerSlot,
        uint256 startTime,
        uint256 endTime,
        string memory infoUrl
    ) external nonReentrant returns (uint256 campaignId) {
        require(IERC721(nftAddress).balanceOf(address(this)) >= 0, "Invalid NFT address");
        require(totalSlots > 0, "Invalid slots");
        require(amountPerSlot > 0, "Invalid amount");
        require(endTime > startTime, "Invalid time");

        campaignId = _campaigns.length;

        Campaign memory newCampaign =
            Campaign({
                campaignId: campaignId,
                nftAddress: nftAddress,
                tokenAddress: tokenAddress,
                remainSlots: totalSlots,
                amountPerSlot: amountPerSlot,
                startTime: startTime,
                endTime: endTime,
                campaignOwner: _msgSender(),
                status: 0,
                infoURL: infoUrl
            });

        _campaigns.push(newCampaign);
        _waitlist.push(campaignId);
        _ownedCampaigns[_msgSender()].push(campaignId);
        _nftToCampaigns[nftAddress].push(campaignId);

        IERC20(tokenAddress).transferFrom(
            _msgSender(),
            address(this),
            totalSlots.mul(amountPerSlot)
        );

        emit CampaignAdded(
            campaignId,
            nftAddress,
            tokenAddress,
            totalSlots,
            amountPerSlot,
            startTime,
            endTime,
            _msgSender(),
            infoUrl
        );

        return campaignId;
    }

    /**
     * @dev Accept a campaign
     * - Can only be called by contract owner
     * @param campaignId Campaign id
     */
    function acceptCampaign(uint256 campaignId) external onlyOwner validCampaignId(campaignId) {
        require(
            block.timestamp < _campaigns[campaignId].startTime &&
                _campaigns[campaignId].status == 0,
            "Cannot accept expired campaign"
        );
        _campaigns[campaignId].status = 1;
        _waitlist.removeAtValue(campaignId);
        emit CampaignAccepted(campaignId);
    }

    /**
     * @dev Remove expired campaigns
     * - Can only be called by contract owner
     */
    function removeExpiredCampaigns() external onlyOwner {
        for (uint256 i = 0; i < _waitlist.length; i++) {
            uint256 campaignId = _waitlist[i];
            Campaign memory info = _campaigns[campaignId];
            if (info.startTime < block.timestamp) {
                _waitlist.removeAtIndex(i);
                i -= 1;
            }
        }
    }

    /**
     * @dev Add more slots to campaign
     * - Can only be called by campaign owner
     * @param campaignId Campaign id
     * @param slots Total slots to be added
     */
    function addMoreSlots(uint256 campaignId, uint256 slots) external nonReentrant {
        require(_campaigns[campaignId].campaignOwner == _msgSender(), "Campaign owner required");
        require(
            block.timestamp < _campaigns[campaignId].endTime && _campaigns[campaignId].status < 3,
            "Invalid campaign"
        );

        Campaign memory info = _campaigns[campaignId];

        IERC20(info.tokenAddress).transferFrom(
            _msgSender(),
            address(this),
            slots.mul(info.amountPerSlot)
        );

        _campaigns[campaignId].remainSlots = info.remainSlots.add(slots);
    }

    /**
     * @dev Reschedule a campaign
     * - Can be called by anyone who own nft
     * @param campaignId Campaign id
     * @param startTime Campaign start time
     * @param endTime Campaign end time
     */
    function rescheduleCampaign(
        uint256 campaignId,
        uint256 startTime,
        uint256 endTime
    ) external {
        require(_campaigns[campaignId].campaignOwner == _msgSender(), "Campaign owner required");
        require(
            block.timestamp < _campaigns[campaignId].startTime &&
                _campaigns[campaignId].status < 2,
            "Campaign should not be started"
        );
        require(endTime > startTime, "Invalid time");

        _campaigns[campaignId].startTime = startTime;
        _campaigns[campaignId].endTime = endTime;
    }

    /**
     * @dev Extend a campaign
     * - Can be called by anyone who own nft
     * @param campaignId Campaign id
     * @param endTime Campaign end time
     */
    function extendCampaign(uint256 campaignId, uint256 endTime) external {
        require(_campaigns[campaignId].campaignOwner == _msgSender(), "Campaign owner required");
        require(_campaigns[campaignId].status < 3, "Campaign Ended");
        require(endTime > _campaigns[campaignId].endTime, "Invalid time");

        _campaigns[campaignId].endTime = endTime;
    }

    /**
     * @dev Claim token
     * - Can be called by anyone who own nft
     * @param campaignId Campaign id
     * @param nftIds List of owned nfts
     * @param receiver Receiver address
     */
    function claim(
        uint256 campaignId,
        uint256[] memory nftIds,
        address receiver
    ) external validCampaignId(campaignId) nonReentrant {
        require(_campaigns[campaignId].status == 1, "Invalid Campaign");
        require(
            block.timestamp >= _campaigns[campaignId].startTime &&
                block.timestamp <= _campaigns[campaignId].endTime,
            "Invalid claim timing"
        );

        uint256 totalClaim = 0;

        for (uint256 i = 0; i < nftIds.length; i++) {
            if (
                IERC721(_campaigns[campaignId].nftAddress).ownerOf(nftIds[i]) == _msgSender() &&
                _claimStatus[campaignId][nftIds[i]] == false
            ) {
                if (_campaigns[campaignId].remainSlots <= 0) break;
                totalClaim = totalClaim.add(_campaigns[campaignId].amountPerSlot);
                _claimStatus[campaignId][nftIds[i]] = true;
                _campaigns[campaignId].remainSlots = _campaigns[campaignId].remainSlots.sub(1);
            }
        }

        if (totalClaim > 0) {
            IERC20(_campaigns[campaignId].tokenAddress).transfer(receiver, totalClaim);
        }

        emit Claimed(campaignId, nftIds, totalClaim, _msgSender(), receiver);
    }

    /**
     * @dev Pause a campaign
     * - Can only be called by campaign owner
     * @dev campaignId Campaign id
     */
    function pauseCampaign(uint256 campaignId) external {
        require(_campaigns[campaignId].campaignOwner == _msgSender(), "Campaign owner required");
        require(
            _campaigns[campaignId].status == 1 &&
                block.timestamp <= _campaigns[campaignId].endTime,
            "Campaign is not running"
        );

        _campaigns[campaignId].status = 2;

        emit PauseCampaign(campaignId);
    }

    /**
     * @dev Resume a campaign
     * - Can only be called by campaign owner
     * @param campaignId Campaign id
     */
    function resumeCampaign(uint256 campaignId) external {
        require(_campaigns[campaignId].campaignOwner == _msgSender(), "Campaign owner required");
        require(
            _campaigns[campaignId].status == 2 &&
                block.timestamp >= _campaigns[campaignId].startTime &&
                block.timestamp <= _campaigns[campaignId].endTime,
            "Campaign can not resume"
        );

        _campaigns[campaignId].status = 1;

        emit ResumeCampaign(campaignId);
    }

    /**
     * @dev Force end a campaign in emergency
     * - Can only be called by campaign owner or system admin
     * @param campaignId Campain id
     */
    function forceEnd(uint256 campaignId) external nonReentrant {
        require(
            _campaigns[campaignId].campaignOwner == _msgSender() || _msgSender() == owner(),
            "Campaign owner or system admin required"
        );

        if (_campaigns[campaignId].status == 0) {
            _waitlist.removeAtValue(campaignId);
        }

        uint256 remainFunds =
            _campaigns[campaignId].remainSlots.mul(_campaigns[campaignId].amountPerSlot);

        _campaigns[campaignId].remainSlots = 0;
        _campaigns[campaignId].status = 3;

        if (remainFunds > 0)
            IERC20(_campaigns[campaignId].tokenAddress).transfer(
                _campaigns[campaignId].campaignOwner,
                remainFunds
            );

        emit ForceEndCampaign(campaignId);
    }

    /**
     * @dev Get information of a campaign
     * @param campaignId Campaign id
     */
    function getCampaignById(uint256 campaignId) external view returns (Campaign memory) {
        return _campaigns[campaignId];
    }

    /**
     * @dev Get campaigns owned by a user
     * @param user User address
     */
    function getCampaignsByOwner(address user) external view returns (uint256[] memory) {
        return _ownedCampaigns[user];
    }

    /**
     * @dev Get campaigns of a nft address
     * @param nft Nft address
     */
    function getCampaignsByNft(address nft) external view returns (uint256[] memory) {
        return _nftToCampaigns[nft];
    }

    /**
     * @dev Get claimable amount by list of nfts
     * @param campaignId Campaign id
     * @param nftIds List of nfts
     */
    function claimableAmount(
        uint256 campaignId,
        address user,
        uint256[] memory nftIds
    ) external view returns (uint256) {
        if (
            block.timestamp < _campaigns[campaignId].startTime ||
            block.timestamp > _campaigns[campaignId].endTime ||
            _campaigns[campaignId].remainSlots <= 0
        ) {
            return 0;
        }

        uint256 claimableSlots = 0;

        for (uint256 i = 0; i < nftIds.length; i++) {
            if (
                IERC721(_campaigns[campaignId].nftAddress).ownerOf(nftIds[i]) == user &&
                _claimStatus[campaignId][nftIds[i]] == false
            ) {
                if (claimableSlots >= _campaigns[campaignId].remainSlots) break;
                claimableSlots = claimableSlots.add(1);
            }
        }

        return claimableSlots.mul(_campaigns[campaignId].amountPerSlot);
    }

    /**
     * @dev  Get claim status
     * @param campaignId Campaign id
     * @param nftId NFT id
     */
    function getClaimStatus(uint256 campaignId, uint256 nftId) external view returns (bool) {
        return _claimStatus[campaignId][nftId];
    }

    /**
     * @dev  Get the campaigns that are in wait list
     */
    function getWaitList() external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](_waitlist.length);
        for (uint256 i = 0; i < _waitlist.length; i++) {
            result[i] = _waitlist[i];
        }

        return result;
    }

    /**
     * @dev  Get all campaigns
     */
    function getAllCaimpaigns() external view returns (Campaign[] memory) {
        return _campaigns;
    }

    /**
     * @dev  Get the numbers of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return _campaigns.length;
    }
}
