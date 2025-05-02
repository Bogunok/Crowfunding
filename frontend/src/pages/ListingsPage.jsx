import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import StudentNFTABI from '../contracts/StudentNFT.json';
import MarketplaceABI from '../contracts/Marketplace.json';
import { Web3Context } from '../context/Web3Context';
import '../styles/ListingsPage.css'; 
import { Link } from 'react-router-dom';
import { STUDENTNFT_ADDRESS, MARKETPLACE_ADDRESS} from '../constants';


function ListingsPage() {
  const { signer, isWalletConnected, address: currentWalletAddress } = useContext(Web3Context);
  const [listedNFTs, setListedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function fetchUserRole() {
      if (currentWalletAddress) {
        try {
          const response = await fetch(`http://localhost:5000/api/auth/users/${currentWalletAddress}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role);
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
    async function loadListedNFTs() {
      setLoading(true);
      setError(null);
      try {
        if (isWalletConnected && signer) {
          const marketplaceContract = new ethers.Contract(
            MARKETPLACE_ADDRESS,
            MarketplaceABI,
            signer
          );
          const nftContract = new ethers.Contract(
            STUDENTNFT_ADDRESS,
            StudentNFTABI,
            signer
          );

          // Fetch all active listings using the contract function
          const activeListings = await marketplaceContract.getAllActiveListings();
          const listings = [];

          for (const listing of activeListings) {
            const { nftContractAddress, tokenId, price, seller, isListed } = listing;

            if (nftContractAddress.toLowerCase() === STUDENTNFT_ADDRESS.toLowerCase() && !isListed) {
              try {
                const tokenURI = await nftContract.tokenURI(tokenId);
                const processedUri = tokenURI.replace("ipfs://", "");
                const metadataResponse = await fetch(`http://localhost:8080/ipfs/${processedUri}`);
                const metadata = await metadataResponse.json();
                const imageUri = metadata.image.replace("ipfs://", "");

                // Fetch SO name using the seller's wallet address
                let sellerUsername = seller;
                try {
                  const usernameResponse = await fetch(`http://localhost:5000/api/auth/users/username/${seller}`);
                  if (usernameResponse.ok) {
                    const usernameData = await usernameResponse.json();
                    sellerUsername = usernameData.username;
                  }
                } catch (usernameError) {
                  console.error('Error fetching SO name:', usernameError);
                }

                listings.push({
                  listingId: Number(tokenId), 
                  tokenId: Number(tokenId),
                  price: ethers.formatEther(price),
                  seller: sellerUsername,
                  imageUri,
                  metadata,
                });
              } catch (metadataError) {
                console.error('Error fetching metadata:', metadataError);
              }
            }
          }
          setListedNFTs(listings);
        }
      } catch (err) {
        console.error('Error loading listed NFTs:', err);
        setError('Failed to load listed NFTs.');
      } finally {
        setLoading(false);
      }
    }

    loadListedNFTs();
  }, [isWalletConnected, signer]);
  

  const handleBuyNFT = async (nft) => {
    if (!currentWalletAddress || userRole !== 'student') {
      setError('Only logged-in students can buy NFTs.');
      return;
    }

    if (!nft) {
      setError('NFT details are missing.');
      return;
    }

    try {
      const marketplaceContract = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MarketplaceABI,
        signer
      );
      const priceInWei = ethers.parseEther(nft.price);
      const tx = await marketplaceContract.buyNFT(STUDENTNFT_ADDRESS, nft.tokenId, {
        value: priceInWei,
      });
      setLoading(true);
      await tx.wait();
      alert(`Successfully bought NFT with Token ID: ${nft.tokenId}`);
      // Refresh the listings after a successful purchase
      loadListedNFTs();
    } catch (error) {
      console.error('Error buying NFT:', error);
      setError('Failed to buy NFT.');
    } finally {
      setLoading(false);
    }
  };

  if (!isWalletConnected) {
    return <div className="container">Please connect your wallet to view listings.</div>;
  }

  if (loading) {
    return <div className="container">Loading listed NFTs...</div>;
  }

  if (error) {
    return <div className="container">Error: {error}</div>;
  }

  return (
    <div className="listings-page">
      <h2 className="page-title">Listed NFTs</h2>
      {listedNFTs.length > 0 ? (
        <div className="nft-grid">
          {listedNFTs.map((nft) => (
            <div key={nft.listingId} className="nft-card">
              <Link to={`/nfts/${nft.tokenId}`}>
                {nft.imageUri && (
                  <img
                    src={`http://localhost:8080/ipfs/${nft.imageUri}`}
                    alt={nft.metadata?.name}
                    className="nft-image"
                  />
                )}
                <h3 className="nft-name">{nft.metadata?.name || `Token ID: ${nft.tokenId}`}</h3>
              </Link>
              <p className="nft-price">Price: {nft.price} WBT</p>
              <p className="nft-seller">Seller: {nft.seller}</p>
              {userRole === 'student' && (
                <button className="buy-button" onClick={() => handleBuyNFT(nft)}>
                  Buy
                </button>
              )}
              {userRole !== 'student' && <p className="buy-restricted">Only students can buy.</p>}
            </div>
          ))}
        </div>
      ) : (
        <p>No NFTs are currently listed for sale.</p>
      )}
    </div>
  );
}

export default ListingsPage;