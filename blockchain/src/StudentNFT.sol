// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract StudentNFT is ERC721URIStorage {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    /// @notice Base URI for the metadata of the NFTs.
    string private _baseTokenURI;
      
    /// @notice Contract URI for the collection metadata.
    string private  _contractURI;


    /// @notice Address of the marketplace contract that is approved to handle these NFTs.
    address public marketplace;

    mapping(uint256 => address) private _minters;

    /// @dev Emitted when a new NFT is minted.
    /// @param tokenId The ID of the newly minted NFT.
    /// @param tokenURI The URI pointing to the metadata of the NFT.
    /// @param marketplace The address of the marketplace contract.
    /// @param minter The address that minted the NFT.
    event MintedNFT(uint256 indexed tokenId, string tokenURI, address marketplace, address minter);

    /**
     * @dev Constructor to set the name, symbol of the NFT collection, and marketplace address.
     * @param _marketplaceAddress The address of the marketplace contract that will be allowed to operate on these NFTs.
     */
    constructor(address _marketplaceAddress) ERC721("Crowfunding", "CROW") {
        marketplace = _marketplaceAddress;
    }


    /**
     * @dev Mints a new NFT to the caller with the given metadata URI.
     * The marketplace address is automatically approved to handle this NFT.
     * @param ipfsMetadataURI The URI pointing to the NFT's metadata (e.g., on IPFS).
     * @return newItemId The ID of the newly minted NFT.
     */
    function mintNFT(string memory ipfsMetadataURI) external returns (uint256) {
        _tokenIdCounter.increment();
        uint256 newItemId = _tokenIdCounter.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, ipfsMetadataURI);
        setApprovalForAll(marketplace, true);
        _minters[newItemId] = msg.sender; // Store the address of the account that minted this token.
        emit MintedNFT(newItemId, ipfsMetadataURI, marketplace, msg.sender);
        return newItemId;

    }

    /**
     * @dev Returns the total number of NFTs that have been minted by this contract.
     * @return The total number of minted NFTs.
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function baseTokenURI() public view returns (string memory) {
        return _baseTokenURI;
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

}