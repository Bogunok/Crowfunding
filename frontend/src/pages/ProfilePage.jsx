import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import StudentNFTABI from '../contracts/StudentNFT.json';
import { Web3Context } from '../context/Web3Context';
import '../styles/ProfilePage.css';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate

const STUDENTNFT_ADDRESS = '0x1b8758C7abE4fe288a3Eee9f117eCFa6Aaee3E9a';

function ProfilePage({ user, onLogout }) {
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const { signer, isWalletConnected } = useContext(Web3Context);
  const navigate = useNavigate(); // Get navigate function

  useEffect(() => {
    async function initializeContract() {
      if (isWalletConnected && signer) {
        try {
          const studentNFTContract = new ethers.Contract(
            STUDENTNFT_ADDRESS,
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
    async function fetchUserMintedNFTs() {
      if (contract && isWalletConnected && user && user.wallet_address) {
        setLoading(true);
        setError(null);
        try {
          const totalSupply = await contract.totalSupply();
          console.log('Total Supply:', Number(totalSupply));
          const nfts = [];
          for (let i = 1; i <= Number(totalSupply); i++) {
            const tokenId = i;
            console.log('Token ID:', tokenId);
            const tokenURI = await contract.tokenURI(tokenId);
            console.log(tokenURI);
            const processedUri = tokenURI.replace("ipfs://", "");
            const response = await fetch(`http://localhost:8080/ipfs/${processedUri}`);
            const metadata = await response.json();
            const imageUri = metadata.image.replace("ipfs://", "");

            // Fetch the owner of the NFT
            const owner = await contract.ownerOf(tokenId);
            console.log(`Owner of token ${tokenId}:`, owner);

            // Check if the owner matches the user's wallet address
            if (owner.toLowerCase() === user.wallet_address.toLowerCase()) {
              nfts.push({ tokenId, metadata, imageUri });
            }
          }
          setMintedNFTs(nfts);
        } catch (err) {
          console.error('Error fetching user minted NFTs:', err);
          setError('Error fetching user minted NFTs.');
        } finally {
          setLoading(false);
        }
      } else if (!isWalletConnected) {
        setMintedNFTs([]);
        setLoading(false);
      }
    }

    fetchUserMintedNFTs();
  }, [contract, isWalletConnected, user]);

  const maskWalletAddress = (address) => {
    if (!address) {
      return '';
    }
    const firstPart = address.slice(0, 6);
    const lastPart = address.slice(-4);
    return `${firstPart}...${lastPart}`;
  };

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  if (!isWalletConnected) {
    return (
      <div className="profile-container">
        <h2>User Profile</h2>
        <div className="profile-info">
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Wallet Address:</strong> {maskWalletAddress(user.wallet_address)}</p>
        </div>
        <p className="connect-wallet-message">Please connect your wallet to view your minted NFTs.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="profile-container"><p className="loading-message">Loading your minted NFTs...</p></div>;
  }

  if (error) {
    return <div className="profile-container"><p className="error-message">Error: {error}</p></div>;
  }

  const handleLogoutClick = () => {
    onLogout();
    navigate('/'); // Redirect to homepage after logout
  };

  return (
    <div className="profile-page-container"> {/* Main container */}
      <button onClick={handleLogoutClick} className="logout-button top-right">Logout</button> {/* Logout button */}
      <div className="profile-container">
        <h2>User Profile</h2>
        <div className="profile-info">
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Wallet Address:</strong> {maskWalletAddress(user.wallet_address)}</p>
        </div>

        <div className="minted-nfts-section">
          <h3>Your Minted NFTs</h3>
          {mintedNFTs.length === 0 ? (
            <p className="no-nfts-message">You haven't minted any NFTs yet.</p>
          ) : (
            <div className="nft-grid">
              {mintedNFTs.map((nft) => (
                <Link key={nft.tokenId} to={`/nfts/${nft.tokenId}`} className="nft-card-link">
                  <div className="nft-card">
                    <div className="nft-card-content">
                      <h3 className="nft-token-id">Token ID: {nft.tokenId}</h3>
                      {nft.metadata && (
                        <div className="nft-metadata">
                          {nft.metadata.image && <img src={`http://localhost:8080/ipfs/${nft.imageUri}`} alt={nft.metadata.name} className="nft-image" />}
                          {nft.metadata.name && <p className="nft-name">Name: {nft.metadata.name}</p>}
                          {nft.metadata.description && <p className="nft-description">{nft.metadata.description}</p>}
                        </div>
                      )}
                      {!nft.metadata && <p className="nft-metadata-not-found">Metadata not found for this NFT.</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;