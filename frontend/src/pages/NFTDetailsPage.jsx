import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'react-router-dom';
import StudentNFTABI from '../contracts/StudentNFT.json';
import MarketplaceABI from '../contracts/Marketplace.json'; 
import AuctionFactoryABI from '../contracts/AuctionFactory.json';
import { Web3Context } from '../context/Web3Context';
import '../styles/NFTDetailsPage.css';
import { STUDENTNFT_ADDRESS, MARKETPLACE_ADDRESS, AUCTIONFACTORY_ADDRESS} from '../constants';
 

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
  // --- Auction specific state ---
  const [auctionFactoryContract, setAuctionFactoryContract] = useState(null);
  const [isInAuction, setIsInAuction] = useState(false);
  const [checkingAuctionStatus, setCheckingAuctionStatus] = useState(false);

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

          const auctionFactory = new ethers.Contract(
            AUCTIONFACTORY_ADDRESS,
            AuctionFactoryABI,
            signer
        );
        setAuctionFactoryContract(auctionFactory);

        } catch (err) {
          console.error('Error initializing contracts:', err);
          setError('Error initializing contracts.');
          setLoading(false);
        }
      } else {
        setContract(null);
        setMarketplaceContract(null);
        setAuctionFactoryContract(null);
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
          try {
            const usernameResponse = await fetch(`http://localhost:5000/api/auth/users/username/${owner}`); 
            if (usernameResponse.ok) {
              const usernameData = await usernameResponse.json();
              ownerUsername = usernameData.username;
            } else if (usernameResponse.status === 404) {
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


  // --- Effect to check Auction Status ---
  useEffect(() => {
    async function checkAuctionStatus() {
        // Requires auction factory contract and a valid tokenId
        if (auctionFactoryContract && tokenId) {
            setCheckingAuctionStatus(true); // Start loading specifically for auction check
            setIsInAuction(false); // Reset status before check
            try {
                // 1. Get all active auction addresses
                const activeAuctionAddresses = await auctionFactoryContract.getActiveAuctions();

                if (activeAuctionAddresses.length === 0) {
                    console.log("No active auctions found.");
                    setIsInAuction(false); // No auctions, so not in one
                    return; // Exit early
                }

                // 2. For each active auction, get its info (especially the tokenId)
                //    Using Promise.allSettled to handle cases where getAuctionInfo might fail for one auction
                const auctionInfoPromises = activeAuctionAddresses.map(addr =>
                    auctionFactoryContract.getAuctionInfo(addr)
                        .then(info => ({ status: 'fulfilled', value: info, address: addr })) // Wrap result
                        .catch(error => ({ status: 'rejected', reason: error, address: addr })) // Wrap error
                );

                const results = await Promise.allSettled(auctionInfoPromises);

                // 3. Check if any active auction matches the current tokenId
                let foundInAuction = false;
                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        const auctionInfo = result.value.value; // Access the actual info object
                        const auctionTokenId = Number(auctionInfo.tokenId); // Convert BigInt/string to Number
                         // Compare with the current page's tokenId (ensure types match)
                        if (auctionTokenId === Number(tokenId)) {
                            console.log(`Token ${tokenId} found in active auction: ${result.value.address}`);
                            foundInAuction = true;
                            break; // Found a match, no need to check further
                        }
                    } else {
                        // Log errors for auctions we couldn't get info for, but continue checking others
                        console.warn(`Could not get auction info for ${result.reason.address}:`, result.reason.reason);
                    }
                }

                setIsInAuction(foundInAuction); // Update state based on whether a match was found

            } catch (err) {
                console.error(`Error checking auction status for token ${tokenId}:`, err);
                // setError("Could not verify auction status."); // Optional: set error
                setIsInAuction(false); // Assume not in auction on error
            } finally {
                setCheckingAuctionStatus(false); // Stop loading for auction check
            }
        } else {
            setIsInAuction(false); // Reset if contract not ready
        }
    }

    checkAuctionStatus();
    // Dependency: Re-check if auction factory contract or tokenId changes
}, [auctionFactoryContract, tokenId]);


  const handleBuyNFT = async () => {
    if (!currentWalletAddress || userRole !== 'student') {
      setError('Only logged-in students can buy NFTs.');
      return;
    }

    if (!listingPrice) {
    setError('This NFT is not for sale or price is not loaded.');
    return;
    }

  if (userRole !== 'student') {
    setError('Only students can buy NFTs.');
    return;
  }

  setLoading(true);
  try {
  
    const priceInWei = ethers.parseEther(listingPrice);
    const approveTx = await contract.setApprovalForAll(MARKETPLACE_ADDRESS, true);
    await approveTx.wait();
    const tx = await marketplaceContract.buyNFT(STUDENTNFT_ADDRESS, nftDetails.tokenId, {value: priceInWei });
    const receipt = await tx.wait();
    setLoading(false);
    alert('NFT bought successfully!');
  } catch (error) {
    console.error('Error buying NFT:', error);
    setError('Failed to buy NFT.');
    setLoading(false);
  }
  };



  const handleListNFT = async () => {
   
    if (!marketplaceContract || !contract || !nftDetails?.tokenId) { 
        alert('Cannot list: Contracts not ready or NFT details missing. Please wait or refresh.');
        setError('Cannot list: Contracts not ready or NFT details missing.'); 
        return;
    }
    if (!isOwner) {
        
        alert('You do not own this NFT.');
        setError('You do not own this NFT.');
        return;
    }

    if (isListed) {
        alert('This NFT is already listed on the marketplace.');
        setError('This NFT is already listed on the marketplace.');
        return;
    }

    if (isInAuction) {
        alert('This NFT is currently in an auction and cannot be listed on the marketplace.');
        return; 
    }
   
    const price = prompt('Enter the listing price in WBT:'); 
    if (price === null || price.trim() === '' || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
         alert('Invalid price entered. Please enter a positive number.'); 
        setError('Invalid price entered.'); 
        return;
    }

    setError(null);
    setLoading(true); 

    try {
        const priceInWei = ethers.parseEther(price);

        console.log(`Approving marketplace (${MARKETPLACE_ADDRESS}) for token ${nftDetails.tokenId}...`);
        const approvalTx = await contract.approve(MARKETPLACE_ADDRESS, nftDetails.tokenId);
        await approvalTx.wait();
        console.log('Approval successful.');

        console.log(`Listing token ${nftDetails.tokenId} for ${price} WBT (${priceInWei.toString()} wei)...`);
        const listTx = await marketplaceContract.listNFT(
            STUDENTNFT_ADDRESS,
            nftDetails.tokenId,
            priceInWei
        );
        await listTx.wait();
        console.log('NFT listed successfully!');

        setIsListed(true);
        setListingPrice(price);
        alert('NFT listed successfully!'); 

    } catch (error) {
        console.error('Error listing NFT:', error);
        let userMessage = 'Listing failed. Check console for details.';
        if (error.code === 'ACTION_REJECTED') {
             userMessage = 'Transaction rejected in wallet.';
        } else if (error.message.includes('insufficient funds')) {
             userMessage = 'Listing failed: Insufficient funds for gas.';
        } else if (error.message.includes('already listed')) {
             userMessage = 'Listing failed: Contract indicates token is already listed.';
             setIsListed(true); 
        }
        alert(`Error: ${userMessage}`); 
        setError(userMessage); 
    } finally {
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


  const handleUpdatePrice = async () => {
    setError(null); 
    if (!marketplaceContract || !nftDetails?.tokenId) {
        setError('Marketplace contract not initialized or NFT details missing.');
        return;
    }
    if (!isOwner) {
        setError('You are not the owner of this NFT.');
        return;
    }
    if (!isListed) {
        setError('This NFT is not currently listed for sale.');
        return;
    }
    if (userRole !== 'student organization') {
        setError('Only student organizations can update the price of NFTs.');
        return;
    }

    const newPrice = prompt('Enter the new listing price in WBT:', listingPrice || ''); 
     if (newPrice === null) return; 
    if (newPrice.trim() === '' || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) {
        setError('Please enter a valid positive price.');
        return;
    }
    if (newPrice === listingPrice) {
        setError('The new price is the same as the current price.');
        return;
    }


    setLoading(true);
    try {
        const newPriceInWei = ethers.parseEther(newPrice);
        const tx = await marketplaceContract.updatePrice(
             nftDetails.tokenId,
             newPriceInWei
        );
        await tx.wait();

        setListingPrice(newPrice); // Update the displayed price
        alert('NFT price updated successfully!');

    } catch (error) {
        console.error('Error updating NFT price:', error);
        setError(`Failed to update NFT price. ${error.reason || error.message}`);
        // Price state remains unchanged on error
    } finally {
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

        {/* Main card container */}
        <div className="nft-details-card">

            {/* Token ID - Placed above the two columns */}
            <h3 className="nft-token-id">Token ID: {nftDetails.tokenId}</h3>

            {/* Flex container for side-by-side layout */}
            <div className="nft-content-wrapper">

                {/* Left Column: Image */}
                {nftDetails.metadata?.image ? (
                    <div className="nft-image-container">
                        <img
                            src={`http://localhost:8080/ipfs/${nftDetails.imageUri}`} 
                            alt={nftDetails.metadata.name || `NFT Token ${nftDetails.tokenId}`}
                            className="nft-image"
                        />
                    </div>
                ) : (
                    <div className="nft-image-placeholder">No Image Available</div> // Placeholder if no image
                )}

                {/* Right Column: Text Details and Actions */}
                <div className="nft-text-details">
                    {/* Metadata Text */}
                    {nftDetails.metadata ? (
                        <div className="nft-metadata-text">
                            {nftDetails.metadata.name && <p className="nft-name"><strong>Name:</strong> {nftDetails.metadata.name}</p>}
                            {nftDetails.metadata.description && (
                                <p className="nft-description"><strong>Description:</strong> {nftDetails.metadata.description}</p>
                            )}
                            {/* Display other metadata properties */}
                            {Object.keys(nftDetails.metadata).map((key) => {
                                if (key !== 'name' && key !== 'description' && key !== 'image') {
                                    // Simple display for other attributes
                                    let value = nftDetails.metadata[key];
                                    try {
                                        value = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
                                     } catch (e) { /* Ignore stringify errors */ }

                                    return (
                                        <p key={key} className={`nft-attribute nft-${key}`}>
                                            <strong>{`${key.charAt(0).toUpperCase() + key.slice(1)}:`}</strong> {String(value)}
                                        </p>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    ) : (
                        <p className="nft-metadata-not-found">Metadata could not be loaded.</p>
                    )}

                    {/* Owner Info */}
                    {nftDetails.owner && ( 
                        <div className="nft-owner-info">
                            
                            <p><strong>Owner:</strong> {nftDetails.ownerUsername || 'Loading...'}</p> 
                            <p><strong>Wallet:</strong> {nftDetails.owner}</p> {/* Display owner's actual wallet */}
                        </div>
                    )}

                    {/* Purchase Info / Status */}
                    <div className="nft-status-action">
                        {isListed ? (
                            <div className="nft-purchase-info listed">
                                 
                                {userRole === 'student' && currentWalletAddress.toLowerCase() !== nftDetails.owner.toLowerCase() && ( // Ensure user is not owner
                                    <button className="buy-button" onClick={handleBuyNFT}>
                                        Buy Now
                                    </button>
                                )}
                                
                                {userRole !== 'student' && (
                                    <p className="not-allowed-action info-text">Only students can purchase NFTs.</p>
                                )}
                            </div>
                        ) : (
                            <div className="nft-purchase-info not-listed">
                                <p className="not-for-sale">This NFT is not currently listed for sale.</p>
                            </div>
                        )}
                    </div>


                    {/* Listing Actions (Only for Owner who is an SO) */}
                    {isOwner && userRole === 'student organization' && (
                        <div className="nft-listing-actions">
                            {!isListed ? (
                                <button className="list-button" onClick={handleListNFT}>
                                    List for Sale
                                </button>
                            ) : (
                                <div>
                                    <p className="info-text">Listed for: {listingPrice ? `${listingPrice} WBT` : '...'}</p>
                                    <button className="delist-button" onClick={handleDelistNFT}>
                                        Delist
                                    </button>
                                    
                                    <button
                                        className="update-price-button action-button" 
                                        onClick={handleUpdatePrice}
                                        disabled={loading} 
                                        style={{ marginLeft: '10px' }} 
                                    >
                                        Update Price
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                     {isOwner && userRole !== 'student organization' && (
                         <p className="not-allowed-action info-text">Note: Only Student Organizations can list owned NFTs.</p>
                     )}

                </div> {/* End nft-text-details */}
            </div> {/* End nft-content-wrapper */}
        </div> {/* End nft-details-card */}
    </div> // End container
);
}

export default NFTDetailsPage;