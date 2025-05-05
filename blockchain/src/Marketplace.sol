// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Marketplace
 * @dev contract for listing, buying, and selling ERC721 NFTs.
 */
contract Marketplace {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _listingIds;

    struct Listing {
        address nftContractAddress;
        uint256 tokenId;
        uint256 price;
        address seller;
        bool isListed;
    }

    mapping(uint256 => Listing) private listingsMap;
    mapping(uint256 => uint256) private _tokenListingIds;

    // Emitted when an NFT is successfully listed. Indexed parameters allow for easier off-chain filtering.
    event NFTListed(uint256 indexed listingId, address indexed nftContractAddress, uint256 indexed tokenId, uint256 price, address seller);
    // Emitted when an NFT is successfully bought.
    event NFTBought(uint256 indexed listingId, address indexed nftContractAddress, uint256 indexed tokenId, uint256 price, address buyer, address seller);
    // Emitted when an NFT is successfully delisted.
    event NFTDelisted(uint256 indexed listingId, address indexed nftContractAddress, uint256 indexed tokenId, address seller);
    // Emitted when the price of an NFT is updated.
    event NFTPriceUpdated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 newPrice);

    /**
     * @notice Lists an NFT for sale on the marketplace.
     * @dev Requires the caller to own the NFT and have approved the marketplace contract to transfer it.
     * @param nftContractAddress The address of the ERC721 contract.
     * @param tokenId The ID of the NFT to list.
     * @param price The selling price in Wei (must be > 0).
     */
    function listNFT(address nftContractAddress, uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than zero");
        IERC721 nft = IERC721(nftContractAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "You are not the owner of this NFT");
        require(nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)),
         "Marketplace must be approved to transfer NFT");
        require(_tokenListingIds[tokenId] == 0, "NFT is already listed");
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        listingsMap[listingId] = Listing({nftContractAddress: nftContractAddress, 
        tokenId: tokenId, price: price, seller: msg.sender, isListed: false});
        _tokenListingIds[tokenId] = listingId;
        emit NFTListed(listingId, nftContractAddress, tokenId, price, msg.sender);
    }

    /**
     * @notice Buys a listed NFT.
     * @dev Requires the buyer to send the exact listing price in Ether. Transfers the NFT and payment.
     * @param nftContractAddress The address of the ERC721 contract.
     * @param tokenId The ID of the NFT to buy.
     */
    function buyNFT(address nftContractAddress, uint256 tokenId) external payable {
        uint256 listingId = _tokenListingIds[tokenId];
        require(listingId > 0, "NFT is not listed");
        Listing memory listing = listingsMap[listingId];
        require(!listing.isListed, "NFT is already sold");
        require(msg.value == listing.price, "Incorrect purchase price");
        IERC721(nftContractAddress).transferFrom(listing.seller, msg.sender, listing.tokenId);
        (bool success, ) = payable(listing.seller).call{value: msg.value}("");
        require(success, "Payment failed");
        listingsMap[listingId].isListed = true;
        delete _tokenListingIds[tokenId];
        emit NFTBought(listingId, nftContractAddress, listing.tokenId, listing.price, msg.sender, listing.seller);
    }

    /**
     * @notice Removes an NFT listing from the marketplace.
     * @dev Can only be called by the original seller of the NFT.
     * @param nftContractAddress The address of the ERC721 contract.
     * @param tokenId The ID of the NFT to delist.
     */
    function delistNFT(address nftContractAddress, uint256 tokenId) external {
        uint256 listingId = _tokenListingIds[tokenId];
        require(listingId > 0, "NFT is not listed");
        Listing memory listing = listingsMap[listingId];
        require(listing.seller == msg.sender, "You are not the seller of this NFT");
        require(!listing.isListed, "NFT is already sold");
        delete listingsMap[listingId];
        delete _tokenListingIds[tokenId];
        emit NFTDelisted(listingId, nftContractAddress, tokenId, msg.sender);
    }

    /**
     * @notice Updates the price of an already listed NFT.
     * @dev Can only be called by the original seller. Price must be > 0.
     * @param tokenId The ID of the NFT whose price is being updated.
     * @param newPrice The new price in Wei.
     */
   function updatePrice(uint256 tokenId, uint256 newPrice) external {
        require(newPrice > 0, "Price must be greater than zero");
        uint256 listingId = _tokenListingIds[tokenId];
        require(listingId > 0, "NFT is not listed");
        Listing storage listing = listingsMap[listingId];
        require(listing.seller == msg.sender, "You are not the seller of this NFT");
        require(!listing.isListed, "NFT is already sold"); // Ensure it's still listed for sale

        listingsMap[listingId].price = newPrice;

         emit NFTPriceUpdated(listingId, listing.tokenId, msg.sender, newPrice); 
    }

    /**
     * @notice Gets the details of a specific listing by token ID.
     * @param tokenId The ID of the token.
     * @return nftContractAddressAddress The NFT contract address.
     * @return tokenIdValue The NFT token ID.
     * @return price The listing price in Wei.
     * @return seller The seller's address.
     * @return isListed The status flag (false if active, true if sold). 
     */
    function getListing(uint256 tokenId) external view returns (address nftContractAddressAddress, uint256 tokenIdValue, uint256 price, address seller, bool isListed) {
        uint256 listingId = _tokenListingIds[tokenId];
        require(listingId > 0, "NFT is not listed");
        Listing memory listing = listingsMap[listingId];
        return (listing.nftContractAddress, listing.tokenId, listing.price, listing.seller, listing.isListed);
    }

    /**
     * @notice Gets the listing ID associated with a specific token ID.
     * @param tokenId The ID of the token.
     * @return uint256 The listing ID, or 0 if not listed.
     */
    function getListingId(uint256 tokenId) external view returns (uint256) {
        return _tokenListingIds[tokenId];
    }

    /**
     * @notice Gets all active listings in the marketplace.
     * @return activeListings An array of active listings.
     */
    function getAllActiveListings() external view returns (Listing[] memory) {
        uint256 totalListings = _listingIds.current();
        uint256 activeListingCount = 0;

        // count the number of active listings
        for (uint256 i = 1; i <= totalListings; i++) {
            if (listingsMap[i].nftContractAddress != address(0) && !listingsMap[i].isListed) {
                activeListingCount++;
            }
        }

        // Create an array to store the active listings
        Listing[] memory activeListings = new Listing[](activeListingCount);
        uint256 currentIndex = 0;

        // Populate the array with active listings
        for (uint256 i = 1; i <= totalListings; i++) {
            if (listingsMap[i].nftContractAddress != address(0) && !listingsMap[i].isListed) {
                activeListings[currentIndex] = listingsMap[i];
                currentIndex++;
            }
        }

        return activeListings;
    }
}