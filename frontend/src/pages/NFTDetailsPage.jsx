import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'react-router-dom';
import StudentNFTABI from '../contracts/StudentNFT.json';
import MarketplaceABI from '../contracts/Marketplace.json'; 
import { Web3Context } from '../context/Web3Context';
import '../styles/NFTDetailsPage.css';

const STUDENTNFT_ADDRESS = '0x1b8758C7abE4fe288a3Eee9f117eCFa6Aaee3E9a';
const MARKETPLACE_ADDRESS = '0xAF3124b52D2Fa1B4399bcbe2803C0aBF259EE8a6'; 

function NFTDetailsPage() {
  const { tokenId } = useParams();
  const [nftDetails, setNftDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const { signer, isWalletConnected, address: currentWalletAddress } = useContext(Web3Context);
  const [userRole, setUserRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const [listingPrice, setListingPrice] = useState(null); 
  const [marketplaceContract, setMarketplaceContract] = useState(null);

  useEffect(() => {
    async function initializeContracts() {
      if (isWalletConnected && signer) {
        try {
          const studentNFTContract = new ethers.Contract(
            STUDENTNFT_ADDRESS,
            StudentNFTABI,
            signer
          );
          setContract(studentNFTContract);

          const marketplace = new ethers.Contract(
            MARKETPLACE_ADDRESS,
            MarketplaceABI,
            signer
          );
          setMarketplaceContract(marketplace);
        } catch (err) {
          console.error('Error initializing contracts:', err);
          setError('Error initializing contracts.');
          setLoading(false);
        }
      } else {
        setContract(null);
        setMarketplaceContract(null);
      }
    }

    initializeContracts();
  }, [isWalletConnected, signer]);

  useEffect(() => {
    async function fetchNFTDetails() {
      if (contract && tokenId && isWalletConnected) {
        setLoading(true);
        setError(null);
        try {
          // Fetch basic metadata from IPFS
          const tokenURI = await contract.tokenURI(tokenId);
          const processedUri = tokenURI.replace("ipfs://", "");
          const metadataResponse = await fetch(`http://localhost:8080/ipfs/${processedUri}`);
          const metadata = await metadataResponse.json();
          const imageUri = metadata.image.replace("ipfs://", "");

          // Fetch NFT owner
          const owner = await contract.ownerOf(tokenId);
          setIsOwner(owner.toLowerCase() === currentWalletAddress?.toLowerCase());
          let ownerUsername = owner; // Default to wallet address if username not found
          // Fetch SO name using the owner's wallet address
          try {
            const usernameResponse = await fetch(`http://localhost:5000/api/auth/users/username/${owner}`); // Adjust the API endpoint if needed
            if (usernameResponse.ok) {
              const usernameData = await usernameResponse.json();
              ownerUsername = usernameData.username;
            } else if (usernameResponse.status === 404) {
              // Handle not found
            } else {
              console.error('Error fetching SO name:', usernameResponse.status);
            }
          } catch (usernameError) {
            console.error('Error fetching SO name:', usernameError);
          }

          setNftDetails({ tokenId, metadata, imageUri, owner, ownerUsername });
        } catch (err) {
          console.error('Error fetching NFT details:', err);
          setError('Error fetching NFT details.');
        } finally {
          setLoading(false);
        }
      } else if (!isWalletConnected) {
        setNftDetails(null);
        setLoading(false);
      }
    }

    fetchNFTDetails();
  }, [contract, tokenId, isWalletConnected, currentWalletAddress]);

  useEffect(() => {
    async function fetchUserRole() {
      if (currentWalletAddress) {
        try {
          const response = await fetch(`http://localhost:5000/api/auth/users/${currentWalletAddress}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role); // Assuming your backend returns a 'role' field
          } else {
            console.error('Failed to fetch user role:', response.status);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    }

    fetchUserRole();
  }, [currentWalletAddress]);

  useEffect(() => {
    async function checkListingStatusAndFetchPrice() {
      if (marketplaceContract && tokenId) {
        try {
          const listingId = await marketplaceContract.getListingId(tokenId);
          const isCurrentlyListed = Number(listingId) > 0;
          setIsListed(isCurrentlyListed);

          if (isCurrentlyListed) {
            const listing = await marketplaceContract.getListing(tokenId);
            setListingPrice(ethers.formatEther(listing.price)); 
          } else {
            setListingPrice(null); // Reset listing price if not listed
          }
        } catch (error) {
          console.error('Error checking listing status or fetching price:', error);
          setError('Could not check listing status or fetch price.');
        }
      }
    }

    checkListingStatusAndFetchPrice();
  }, [marketplaceContract, tokenId]);


  const handleBuyNFT = async () => {
    if (!currentWalletAddress || userRole !== 'student') {
      setError('Only logged-in students can buy NFTs.');
      return;
    }

    if (!listingPrice) {
    setError('This NFT is not for sale or price is not loaded.');
    return;
  }

    // In a real scenario, you would interact with a marketplace contract here
    // to transfer the NFT and the price.
    console.log(`Buying NFT with tokenId: ${tokenId} for price: ${nftDetails.price}`);
    alert(`Buying NFT with tokenId: ${tokenId} for price: ${nftDetails.price} (Implementation pending)`);

    // You would typically:
    // 1. Approve the marketplace contract to spend the buyer's funds (if needed).
    // 2. Call a function on the marketplace contract to execute the purchase.
    // 3. Handle transaction success and failure.
  };

  const handleListNFT = async () => {
    if (!marketplaceContract || !contract || !nftDetails?.tokenId) {
      setError('Marketplace or NFT contract not initialized.');
      return;
    }

    if (!isOwner) {
      setError('You are not the owner of this NFT.');
      return;
    }

    if (isListed) {
      setError('This NFT is already listed.');
      return;
    }

    if (userRole !== 'student organization') {
      setError('Only student organizations can list NFTs.');
      return;
    }

    const price = prompt('Enter the listing price in WBT:');
    if (price === null || price.trim() === '') {
      setError('Price cannot be empty.');
      return;
    }

    try {
      const priceInWei = ethers.parseEther(price);
      const tx = await marketplaceContract.listNFT(
        STUDENTNFT_ADDRESS,
        nftDetails.tokenId,
        priceInWei
      );
      setLoading(true);
      await tx.wait();
      setIsListed(true);
      setListingPrice(price);
      setLoading(false);
      alert('NFT listed successfully!');
    } catch (error) {
      console.error('Error listing NFT:', error);
      setError('Failed to list NFT.');
      setLoading(false);
    }
  };

  const handleDelistNFT = async () => {
    if (!marketplaceContract || !nftDetails?.tokenId) {
      setError('Marketplace contract not initialized.');
      return;
    }

    if (!isOwner) {
      setError('You are not the owner of this NFT.');
      return;
    }

    if (!isListed) {
      setError('This NFT is not currently listed.');
      return;
    }

    if (userRole !== 'student organization') {
      setError('Only student organizations can delist NFTs.');
      return;
    }

    try {
      const tx = await marketplaceContract.delistNFT(
        STUDENTNFT_ADDRESS,
        nftDetails.tokenId
      );
      setLoading(true);
      await tx.wait();
      setIsListed(false);
      setListingPrice('');
      setLoading(false);
      alert('NFT delisted successfully!');
    } catch (error) {
      console.error('Error delisting NFT:', error);
      setError('Failed to delist NFT.');
      setLoading(false);
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="container">
        <h2>NFT Details</h2>
        <p>Please connect your wallet to view NFT details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <h2>NFT Details</h2>
        <p>Loading NFT details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h2>NFT Details</h2>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!nftDetails) {
    return (
      <div className="container">
        <h2>NFT Details</h2>
        <p>NFT not found.</p>
      </div>
    );
  }

  return (
    <div className="container nft-details-page">
      <h2 className="page-title">NFT Details</h2>
      <div className="nft-details-card">
        <h3 className="nft-token-id">Token ID: {nftDetails.tokenId}</h3>
        {nftDetails.metadata && (
          <div className="nft-metadata">
            {nftDetails.metadata.image && (
              <img
                src={`http://localhost:8080/ipfs/${nftDetails.imageUri}`}
                alt={nftDetails.metadata.name}
                className="nft-image"
              />
            )}
            {nftDetails.metadata.name && <p className="nft-name">Name: {nftDetails.metadata.name}</p>}
            {nftDetails.metadata.description && (
              <p className="nft-description">Description: {nftDetails.metadata.description}</p>
            )}
            {/* Display other metadata properties here */}
            {Object.keys(nftDetails.metadata).map((key) => {
              if (key !== 'name' && key !== 'description' && key !== 'image') {
                return (
                  <p key={key} className={`nft-${key}`}>
                    {key}: {JSON.stringify(nftDetails.metadata[key])}
                  </p>
                );
              }
              return null;
            })}
          </div>
        )}
        {!nftDetails.metadata && (
          <p className="nft-metadata-not-found">Metadata not found for this NFT.</p>
        )}

        {/* Display SO Information */}
        {isListed ? (
          <div className="nft-purchase-info">
            <p className="nft-price">Price: {listingPrice ? `${listingPrice} WBT` : 'Loading...'}</p>
            {userRole === 'student' && (
              <button className="buy-button" onClick={handleBuyNFT}>
                Buy
              </button>
            )}
            {userRole !== 'student' && <p className="not-allowed-action">Only students can buy NFTs.</p>}
          </div>
        ) : nftDetails.price !== undefined && nftDetails.price !== null ? (
          <div className="nft-purchase-info">
            <p className="nft-price">Price: {nftDetails.price} {/* This was likely a placeholder */}</p>
            {userRole === 'student' && (
              <button className="buy-button" onClick={handleBuyNFT}>
                Buy
              </button>
            )}
            {userRole !== 'student' && <p className="not-allowed-action">Only students can buy NFTs.</p>}
          </div>
        ) : (
          <p className="not-for-sale">This NFT is not currently for sale.</p>
        )}

        {/* List/Delist Functionality */}
        {isOwner && userRole === 'student organization' && (
          <div className="nft-listing-actions">
            {!isListed ? (
              <button className="list-button" onClick={handleListNFT}>
                List NFT
              </button>
            ) : (
              <div>
                <p>Listed for: {listingPrice ? `${listingPrice} WBT` : 'Loading...'}</p>
                <button className="delist-button" onClick={handleDelistNFT}>
                  Delist NFT
                </button>
              </div>
            )}
          </div>
        )}
        {isOwner && userRole !== 'student organization' && (
          <p className="not-allowed-action">Only student organizations can list or delist NFTs.</p>
        )}
      </div>
    </div>
  );
}

export default NFTDetailsPage;