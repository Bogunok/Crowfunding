// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Auction contract
/// @notice This contract manages an auction for a single NFT.
contract Auction is ReentrancyGuard {

    /// @notice Represents the state of the auction.
    enum AuctionState {
        Open,      
        Ended,      
        Cancelled,  
        InstantBuy 
    }

    // --- Structs ---

    /// @notice Represents a bid placed in the auction.
    struct Bid {
        address bidder;
        uint256 amount;  
    }

    // --- State Variables ---

    IERC721 public nft;              ///< @notice The ERC-721 NFT contract.
    uint256 public tokenId;          ///< @notice The ID of the NFT being auctioned.
    address public originalCreator;  ///< @notice The address of the user who created the auction.
    uint256 public creationTime;     ///< @notice The time when the auction contract was created.
    uint256 public startTime;        ///< @notice The time when the auction starts.
    uint256 public endTime;          ///< @notice The time when the auction ends.
    uint256 public instantBuyPrice;  ///< @notice The price for an instant buy.
    uint256 public startPrice;       ///< @notice The starting price of the auction.
    address public highestBidder;    ///< @notice The address of the current highest bidder.
    uint256 public highestBid;       ///< @notice The current highest bid amount.
    bool public isCancelled;         ///< @notice Flag indicating if the auction has been cancelled.
    bool public isInstantBuy;        ///< @notice Flag indicating if the auction was ended by an instant buy.
    Bid[] public bids;               ///< @notice Array of all bids placed in the auction.

    // --- Events ---

    /// @notice Emitted when a bid is placed.
    event BidPlaced(address indexed bidder, uint256 amount);

    /// @notice Emitted when the auction ends.
    event AuctionEnded(address winner, uint256 finalPrice);

    /// @notice Emitted when the auction is cancelled by the creator.
    event AuctionCancelledByCreator(address creator);

    /// @notice Emitted when an instant buy is executed.
    event InstantBuyExecuted(address buyer, uint256 price);

    /// @notice Emitted when funds are withdrawn by the creator.
    event FundsWithdrawn(address indexed creator, uint256 amount);

    /// @notice Emitted when the token is withdrawn by the winner.
    event TokenWithdrawn(address indexed winner);

    // --- Modifiers ---

    /// @notice Modifier to restrict function calls to the original creator of the auction.
    modifier onlyCreator() {
        require(msg.sender == originalCreator, "Only the original auction creator can call this function");
        _;
    }

    /// @notice Modifier to restrict function calls to when the auction is still open.
    modifier auctionNotEnded() {
        require(getAuctionState() == AuctionState.Open, "Auction has already ended or cancelled");
        _;
    }

    /// @notice Modifier to prevent the creator from bidding on their own auction.
    modifier notCreator() {
        require(msg.sender != originalCreator, "Creator cannot bid on their own auction");
        _;
    }

    // --- Functions ---

    /// @notice Constructor for the Auction contract.
    /// @param _nftAddress The address of the NFT contract.
    /// @param _tokenId The ID of the NFT being auctioned.
    /// @param _duration The duration of the auction in seconds.
    /// @param _instantBuyPrice The price for an instant buy.
    /// @param _startPrice The starting price of the auction.
    /// @param _originalCreator The address of the user who created the auction.
    constructor(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _duration,
        uint256 _instantBuyPrice,
        uint256 _startPrice,
        address _originalCreator // Accept the original creator's address
    ) {
        require(_nftAddress != address(0), "NFT address cannot be zero");
        require(_tokenId > 0, "Token ID must be greater than zero");
        require(_duration > 0, "Auction duration must be greater than zero");
        require(_instantBuyPrice > _startPrice, "Instant buy price must be greater than start price");
        require(_startPrice > 0, "Start price must be greater than zero");

        nft = IERC721(_nftAddress);
        tokenId = _tokenId;
        originalCreator = _originalCreator;
        creationTime = block.timestamp;
        startTime = block.timestamp;
        endTime = block.timestamp + _duration;
        instantBuyPrice = _instantBuyPrice;
        startPrice = _startPrice;

        // It's crucial to transfer the NFT ownership to the Auction contract here
        IERC721(_nftAddress).transferFrom(_originalCreator, address(this), _tokenId);
    }

    /// @notice Places a bid on the auction.
    /// @dev Refunds the previous highest bidder if a new higher bid is placed.
    function placeBid() external payable auctionNotEnded notCreator nonReentrant {
        require(msg.value >= startPrice, "Bid must be at least the starting price");
        require(msg.value >= highestBid, "Bid must be at least the current highest bid");

        if (highestBidder != address(0)) {
            // Refund the previous highest bidder
            (bool success, ) = payable(highestBidder).call{value: highestBid}("");
            require(success, "Refund failed");
        }

        highestBidder = msg.sender;
        highestBid = msg.value;
        bids.push(Bid(msg.sender, msg.value));

        emit BidPlaced(msg.sender, msg.value);

        if (msg.value >= instantBuyPrice) {
            isInstantBuy = true;
            emit InstantBuyExecuted(msg.sender, msg.value);
            emit AuctionEnded(msg.sender, msg.value);
        }
    }

    /// @notice Executes an instant buy of the NFT.
    /// @dev Ends the auction immediately if the instant buy price is met.
    function instantBuy() external payable auctionNotEnded notCreator nonReentrant {
        require(msg.value == instantBuyPrice, "Exact instant buy price is required");
        require(highestBid < instantBuyPrice, "Instant buy price already reached or exceeded");

        if (highestBidder != address(0)) {
            // Refund the previous highest bidder
            (bool success, ) = payable(highestBidder).call{value: highestBid}("");
            require(success, "Refund failed");
        }

        highestBidder = msg.sender;
        highestBid = msg.value;
        isInstantBuy = true;
        emit InstantBuyExecuted(msg.sender, msg.value);
        emit AuctionEnded(msg.sender, msg.value);
    }

    /// @notice Allows the highest bidder to withdraw the NFT after the auction ends.
    function withdrawToken() external nonReentrant {
        require(getAuctionState() == AuctionState.Ended || getAuctionState() == AuctionState.InstantBuy, "Auction is not yet over");
        require(msg.sender == highestBidder, "Only the highest bidder can withdraw the token");
        require(highestBidder != address(0), "No bids were placed");

        // Ensure the auction contract has the NFT
        require(nft.ownerOf(tokenId) == address(this), "Auction contract does not own the NFT");

        nft.transferFrom(address(this), highestBidder, tokenId);
        emit TokenWithdrawn(highestBidder);
    }

    /// @notice Allows the creator to withdraw the funds after the auction ends.
    function withdrawFunds() external onlyCreator nonReentrant {
        require(getAuctionState() == AuctionState.Ended || getAuctionState() == AuctionState.InstantBuy, "Auction is not yet over or was cancelled");
        require(highestBidder != address(0), "No bids were placed");

        uint256 amountToWithdraw = highestBid;
        highestBid = 0; // Prevent multiple withdrawals

        (bool success, ) = payable(originalCreator).call{value: amountToWithdraw}("");
        require(success, "Funds withdrawal failed");

        emit FundsWithdrawn(originalCreator, amountToWithdraw);
    }

    /// @notice Allows the creator to cancel the auction.
    /// @dev Returns the NFT to the creator and refunds the highest bidder.
    function cancelAuction() external onlyCreator nonReentrant {
        require(!isCancelled, "Auction has already been cancelled");
        isCancelled = true;
        emit AuctionCancelledByCreator(originalCreator);

        // Return the NFT to the original creator
        if (nft.ownerOf(tokenId) == address(this)) {
            nft.transferFrom(address(this), originalCreator, tokenId);
        }

        // Refund the current highest bidder if any
        if (highestBidder != address(0) && highestBid > 0) {
            address payable payableHighestBidder = payable(highestBidder);
            highestBidder = address(0);
            uint256 amountToRefund = highestBid;
            highestBid = 0;
            (bool success, ) = payableHighestBidder.call{value: amountToRefund}("");
            require(success, "Refund to highest bidder failed");
        }
    }

    /// @notice Gets the current state of the auction.
    /// @return The current state of the auction.
    function getAuctionState() public view returns (AuctionState) {
        if (isCancelled) {
            return AuctionState.Cancelled;
        } else if (isInstantBuy) {
            return AuctionState.InstantBuy;
        } else if (block.timestamp >= endTime || highestBid >= instantBuyPrice) {
            return AuctionState.Ended;
        } else {
            return AuctionState.Open;
        }
    }
}
