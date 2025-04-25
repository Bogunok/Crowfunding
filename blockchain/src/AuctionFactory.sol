// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Auction.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/// @title AuctionFactory contract
/// @notice This contract manages the creation and tracking of auction contracts for NFTs.
contract AuctionFactory {
    using Address for address;

    struct AuctionInfo {
        address auctionAddress;
        address nftAddress;
        uint256 tokenId;
        address originalCreator;
        uint256 startTime;
        uint256 endTime;
    }

    mapping(address => AuctionInfo) public auctions; // Map auction contract address to its info
    address[] public activeAuctions; // Array of active auction contract addresses
    address[] public endedAuctions;   // Array of ended auction contract addresses
    mapping(address => bool) public isAuctionActive; // Track auction status by address


    event AuctionCreated(address indexed originalCreator, address indexed auctionAddress, address nftAddress, uint256 tokenId);
    event AuctionDeleted(address indexed auctionAddress);


    /**
     * @notice Creates a new auction.
     * @param _nftAddress The address of the NFT contract.
     * @param _tokenId The ID of the NFT being auctioned.
     * @param _startTime The start time of the auction.
     * @param _endTime The end time of the auction.
     * @param _instantBuyPrice The price for an instant buy.
     * @param _startPrice The starting price of the auction.
     * @return The address of the newly created Auction contract.
     */
    function createAuction(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _instantBuyPrice,
        uint256 _startPrice
    ) external returns (address) {
        // Get the original creator (the user who called this function)
        address originalCreator = msg.sender;

        // Deploy the Auction contract using the 'new' keyword
        Auction newAuction = new Auction(
            _nftAddress,
            _tokenId,
            _startTime,
            _endTime,
            _instantBuyPrice,
            _startPrice,
            originalCreator // Pass the original creator's address
        );

        address auctionAddress = address(newAuction); // Get the address of the deployed contract

        // Store auction information
        AuctionInfo memory auctionInfo = AuctionInfo({
            auctionAddress: auctionAddress,
            nftAddress: _nftAddress,
            tokenId: _tokenId,
            originalCreator: originalCreator,
            startTime: _startTime,
            endTime: _endTime
        });

        auctions[auctionAddress] = auctionInfo; // Map the auction address to the info
        activeAuctions.push(auctionAddress);     // Add to the active auctions array
        isAuctionActive[auctionAddress] = true;  // Mark as active

        emit AuctionCreated(originalCreator, auctionAddress, _nftAddress, _tokenId);

        return auctionAddress; // Return the address of the new auction contract
    }

    /**
     * @notice Deletes an auction.  Only the original creator can delete.
     * The auction must be cancelled first.
     * @param _auctionAddress The address of the auction to delete.
     */
    function deleteAuction(address _auctionAddress) external {
        // Ensure the auction exists
        require(auctions[_auctionAddress].auctionAddress != address(0), "Auction does not exist");

        // Ensure the sender is the original creator of the auction
        require(auctions[_auctionAddress].originalCreator == msg.sender, "Only original creator can delete");

        // Ensure the auction is not active
        require(!isAuctionActive[_auctionAddress], "Auction must be cancelled or ended to delete");

        // Remove from active/ended arrays.  This is inefficient for large arrays, but acceptable for this example
        if (isAuctionActive[_auctionAddress]) {
            for (uint256 i = 0; i < activeAuctions.length; i++) {
                if (activeAuctions[i] == _auctionAddress) {
                    activeAuctions[i] = activeAuctions[activeAuctions.length - 1];
                    activeAuctions.pop();
                    break;
                }
            }
        } else {
             for (uint256 i = 0; i < endedAuctions.length; i++) {
                if (endedAuctions[i] == _auctionAddress) {
                    endedAuctions[i] = endedAuctions[endedAuctions.length - 1];
                    endedAuctions.pop();
                    break;
                }
            }
        }

        delete auctions[_auctionAddress]; // Remove the auction from the mapping
        emit AuctionDeleted(_auctionAddress);
    }

    /**
     * @notice Gets information about a specific auction.
     * @param _auctionAddress The address of the auction.
     * @return An AuctionInfo struct containing the auction's details.
     */
    function getAuctionInfo(address _auctionAddress) external view returns (AuctionInfo memory) {
        require(auctions[_auctionAddress].auctionAddress != address(0), "Auction does not exist");
        return auctions[_auctionAddress];
    }

    /**
    * @notice Gets the addresses of all active auctions.
    * @return An array of auction addresses.
    */
    function getActiveAuctions() external view returns (address[] memory) {
        return activeAuctions;
    }

    /**
     * @notice Gets the addresses of all ended auctions.
     * @return An array of auction addresses.
     */
    function getEndedAuctions() external view returns (address[] memory) {
        return endedAuctions;
    }

    /**
     * @notice Moves an auction from active to ended.  This should be called by the Auction contract.
     * @param _auctionAddress The address of the auction to move.
     */
    function markAuctionEnded(address _auctionAddress) external {
        AuctionInfo storage info = auctions[_auctionAddress];
        require(info.auctionAddress != address(0), "Auction does not exist");
        require(msg.sender == info.originalCreator, "Only the original auction creator can call this");
            require(isAuctionActive[_auctionAddress], "Auction is not active");

            // Remove from active auctions array
            for (uint256 i = 0; i < activeAuctions.length; i++) {
                if (activeAuctions[i] == _auctionAddress) {
                    activeAuctions[i] = activeAuctions[activeAuctions.length - 1];
                    activeAuctions.pop();
                    break;
                }
            }
            endedAuctions.push(_auctionAddress);  // Add to ended auctions
            isAuctionActive[_auctionAddress] = false; // Update status
    }

     /**
     * @notice Moves an auction from active to ended.  This should be called by the Auction contract.
     * @param _auctionAddress The address of the auction to move.
     */
    function markAuctionCancelled(address _auctionAddress) external {
        AuctionInfo storage info = auctions[_auctionAddress];
        require(info.auctionAddress != address(0), "Auction does not exist");
        require(msg.sender == info.originalCreator, "Only the original auction creator can call this");
            require(isAuctionActive[_auctionAddress], "Auction is not active");

            // Remove from active auctions array
            for (uint256 i = 0; i < activeAuctions.length; i++) {
                if (activeAuctions[i] == _auctionAddress) {
                    activeAuctions[i] = activeAuctions[activeAuctions.length - 1];
                    activeAuctions.pop();
                    break;
                }
            }
            endedAuctions.push(_auctionAddress);  // Add to ended auctions.  We treat cancelled as ended.
            isAuctionActive[_auctionAddress] = false; // Update status
    }
}

