// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract StudentNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    string private _baseTokenURI;

    /**
     * @dev Constructor to set the name and symbol of the NFT collection.
     * @param name_ The name of the NFT collection (e.g., "Student Certificates").
     * @param symbol_ The symbol of the NFT collection (e.g., "SFT").
     */
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable() {}

    /**
     * @dev Returns the base URI for token metadata.
     * @return string The base URI.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Sets the base URI for token metadata. Only the owner can call this function.
     * @param baseTokenURI_ The new base URI to set.
     */
    function setBaseTokenURI(string memory baseTokenURI_) public onlyOwner {
        _baseTokenURI = baseTokenURI_;
    }

    /**
     * @dev Mints a new NFT to the specified recipient with the given metadata URI. Only the owner can call this function.
     * @param recipient The address to which the NFT will be minted.
     * @param ipfsMetadataURI The URI pointing to the NFT's metadata (e.g., on IPFS).
     */
    function mintNFT(address recipient, string memory ipfsMetadataURI) public onlyOwner {
        uint256 newItemId = _tokenIdCounter.current();
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, ipfsMetadataURI);
        _tokenIdCounter.increment();
    }

    /**
     * @dev Returns the URI for a given token ID, constructed from the base URI and the token ID.
     * @param tokenId The ID of the token.
     * @return string The URI of the token's metadata.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, Strings.toString(tokenId), ".json"));
    }

    /**
     * @dev Allows the owner to withdraw any Ether accidentally sent to the contract.
     */
    function withdraw() public onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    bool public paused = false;

    /**
     * @dev Modifier to check if the contract is not paused.
     */
    modifier whenNotPaused() {
        require(!paused, "Pausable: paused");
        _;
    }

    /**
     * @dev Allows the owner to pause or unpause the minting of new NFTs.
     * @param state True to pause, false to unpause.
     */
    function setPaused(bool state) public onlyOwner {
        paused = state;
    }

    /**
     * @dev Safely mints a new NFT to the specified recipient with the given metadata URI, only when not paused. Only the owner can call this function.
     * @param to The address to which the NFT will be minted.
     * @param ipfsMetadataURI The URI pointing to the NFT's metadata.
     */
    function safeMint(address to, string memory ipfsMetadataURI) public onlyOwner whenNotPaused {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsMetadataURI);
    }
}