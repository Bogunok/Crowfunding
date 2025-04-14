import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'react-router-dom';
import StudentNFTABI from '../contracts/StudentNFT.json';
import { Web3Context } from '../context/Web3Context';
import '../styles/NFTDetailsPage.css';

const CONTRACT_ADDRESS = '0x0D1eCdAd8DA0B7701CFC526a1DD12D59594Faa5c';

function NFTDetailsPage() {
  const { tokenId } = useParams();
  const [nftDetails, setNftDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const { signer, isWalletConnected, address: currentWalletAddress } = useContext(Web3Context);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function initializeContract() {
      if (isWalletConnected && signer) {
        try {
          const studentNFTContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            StudentNFTABI,
            signer
          );
          setContract(studentNFTContract);
        } catch (err) {
          console.error('Error initializing contract:', err);
          setError('Error initializing contract.');
          setLoading(false);
        }
      } else {
        setContract(null);
      }
    }

    initializeContract();
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

          // Fetch additional details (SO info, price) from your backend API
          const backendResponse = await fetch(`http://localhost:8080/api/nfts/${tokenId}`); // Assuming this endpoint exists
          if (!backendResponse.ok) {
            throw new Error(`HTTP error! status: ${backendResponse.status}`);
          }
          const backendData = await backendResponse.json();

          setNftDetails({ tokenId, metadata, imageUri, ...backendData }); // Merge data
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
  }, [contract, tokenId, isWalletConnected]);

  useEffect(() => {
    async function fetchUserRole() {
      if (currentWalletAddress) {
        try {
          const response = await fetch(`http://localhost:8080/api/users/${currentWalletAddress}`);
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

  const handleBuyNFT = async () => {
    if (!currentWalletAddress || userRole !== 'student') {
      setError('Only logged-in students can buy NFTs.');
      return;
    }

    if (!nftDetails?.price) {
      setError('This NFT is not for sale.');
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
        {nftDetails.mintedBy && (
          <div className="nft-so-info">
            <h3>Minted By:</h3>
            <p>Name: {nftDetails.mintedBy.name}</p>
            <p>Wallet Address: {nftDetails.mintedBy.walletAddress}</p>
          </div>
        )}

        {/* Display Price and Buy Button */}
        {nftDetails.price !== undefined && nftDetails.price !== null && (
          <div className="nft-purchase-info">
            <p className="nft-price">Price: {nftDetails.price} {/* You might want to format this */}</p>
            <button className="buy-button" onClick={handleBuyNFT}>
              Buy
            </button>
          </div>
        )}
        {nftDetails.price === undefined || nftDetails.price === null ? (
          <p className="not-for-sale">This NFT is not currently for sale.</p>
        ) : null}
      </div>
    </div>
  );
}

export default NFTDetailsPage;