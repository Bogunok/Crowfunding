import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import StudentNFTABI from '../contracts/StudentNFT.json';
import { Web3Context } from '../context/Web3Context';
import '../styles/AllNftsPage.css';
import { Link } from 'react-router-dom'; 
import { STUDENTNFT_ADDRESS} from '../constants';

//const STUDENTNFT_ADDRESS = '0x1b8758C7abE4fe288a3Eee9f117eCFa6Aaee3E9a';

function ViewNFTsPage() {
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const { signer, isWalletConnected } = useContext(Web3Context);

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
    async function fetchMintedNFTs() {
      if (contract && isWalletConnected) {
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

            nfts.push({ tokenId, metadata, imageUri});
          }
          setMintedNFTs(nfts);
        } catch (err) {
          console.error('Error fetching minted NFTs:', err);
          setError('Error fetching minted NFTs.');
        } finally {
          setLoading(false);
        }
      } else if (!isWalletConnected) {
        setMintedNFTs([]);
        setLoading(false);
      }
    }

    fetchMintedNFTs();
  }, [contract, isWalletConnected]);

  if (!isWalletConnected) {
    return (
      <div className="container">
        <h1 className="page-title">Minted Student NFTs</h1>
        <p className="connect-wallet-message">Please connect your wallet to view minted NFTs.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="container"><p className="loading-message">Loading minted NFTs...</p></div>;
  }

  if (error) {
    return <div className="container"><p className="error-message">Error: {error}</p></div>;
  }

  const maskDescription = (text, maxLength) => {
    if (!text) return ''; 
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="container">
      <h1 className="page-title">Minted Student NFTs</h1>
      {mintedNFTs.length === 0 ? (
        <p className="no-nfts-message">No NFTs have been minted yet.</p>
      ) : (
        <div className="nft-grid">
          {mintedNFTs.map((nft) => (
            <Link key={nft.tokenId} to={`/nfts/${nft.tokenId}`} className="nft-card-link"> {/* Wrap with Link */}
              <div className="nft-card">
                <div className="nft-card-content">
                  <h3 className="nft-token-id">Token ID: {nft.tokenId}</h3>
                  {nft.metadata && (
                    <div className="nft-metadata">
                      {nft.metadata.image && <img src={`http://localhost:8080/ipfs/${nft.imageUri}`} alt={nft.metadata.name} className="nft-image" />}
                      {nft.metadata.name && <p className="nft-name">Name: {nft.metadata.name}</p>}
                      {nft.metadata.description && (
                        <p className="nft-description" title={nft.metadata.description}> 
                          {maskDescription(nft.metadata.description, 20)} 
                        </p>
                      )}
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
  );
}

export default ViewNFTsPage;