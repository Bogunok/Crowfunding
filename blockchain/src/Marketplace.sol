// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

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

    event NFTListed(uint256 indexed listingId, address indexed nftContractAddress, uint256 indexed tokenId, uint256 price, address seller);
    event NFTBought(uint256 indexed listingId, address indexed nftContractAddress, uint256 indexed tokenId, uint256 price, address buyer, address seller);
    event NFTDelisted(uint256 indexed listingId, address indexed nftContractAddress, uint256 indexed tokenId, address seller);
    event NFTPriceUpdated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 newPrice);

    function listNFT(address nftContractAddress, uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than zero");
        IERC721 nft = IERC721(nftContractAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "You are not the owner of this NFT");
        require(nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)), "Marketplace must be approved to transfer NFT");
        require(_tokenListingIds[tokenId] == 0, "NFT is already listed");
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        listingsMap[listingId] = Listing({nftContractAddress: nftContractAddress, tokenId: tokenId, price: price, seller: msg.sender, isListed: false});
        _tokenListingIds[tokenId] = listingId;
        emit NFTListed(listingId, nftContractAddress, tokenId, price, msg.sender);
    }

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

    function getListing(uint256 tokenId) external view returns (address nftContractAddressAddress, uint256 tokenIdValue, uint256 price, address seller, bool isListe) {
        uint256 listingId = _tokenListingIds[tokenId];
        require(listingId > 0, "NFT is not listed");
        Listing memory listing = listingsMap[listingId];
        return (listing.nftContractAddress, listing.tokenId, listing.price, listing.seller, listing.isListed);
    }

    function getListingId(uint256 tokenId) external view returns (uint256) {
        return _tokenListingIds[tokenId];
    }

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