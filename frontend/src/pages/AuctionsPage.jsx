import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import DatePicker from 'react-datepicker'; 
import "react-datepicker/dist/react-datepicker.css"; 
import StudentNFTABI from '../contracts/StudentNFT.json';
import MarketplaceABI from '../contracts/Marketplace.json';
import AuctionFactoryABI from '../contracts/AuctionFactory.json';
import { Web3Context } from '../context/Web3Context';
import '../styles/AuctionsPage.css'; 
import '../styles/AuctionModal.css'; 
import { Link } from 'react-router-dom';
import { STUDENTNFT_ADDRESS, AUCTIONFACTORY_ADDRESS, MARKETPLACE_ADDRESS} from '../constants';


function CreateAuctionModal({ show, onClose, ownedNFTs, onCreateAuction, loading }) {
    const [selectedTokenId, setSelectedTokenId] = useState('');
    const [startPrice, setStartPrice] = useState('');
    const [startTime, setStartTime] = useState(null); // State for start Date object
    const [endTime, setEndTime] = useState(null);     // State for end Date object
    const [instantBuyPrice, setInstantBuyPrice] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');

        // --- Validation ---
        if (!selectedTokenId) {
            setError('Please select an NFT to auction.');
            return;
        }
        if (!startPrice || parseFloat(startPrice) <= 0) {
            setError('Please enter a valid starting price greater than 0.');
            return;
        }
         // Time Validation
        if (!startTime) {
            setError('Please select a start time.');
            return;
        }
        if (!endTime) {
            setError('Please select an end time.');
            return;
        }

        const now = new Date();
        const minStartTime = new Date(now.getTime() + 2 * 60 * 1000); 

        if (startTime < minStartTime) {
            setError('Start time must be at least a few minutes in the future to allow for transaction processing.');
            return;
        }

        if (endTime <= startTime) {
            setError('End time must be strictly after the start time.');
            return;
        }
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        if (durationSeconds <= 60) { 
             setError('Auction duration (End Time - Start Time) must be at least 60 seconds.');
             return;
        }

        // Instant buy price validation
        if (instantBuyPrice && parseFloat(instantBuyPrice) <= 0) {
            setError('Instant buy price must be greater than 0 if specified.');
            return;
        }
        // Ensure instant buy price is >= start price if set and > 0
        if (instantBuyPrice && parseFloat(instantBuyPrice) > 0 && parseFloat(instantBuyPrice) < parseFloat(startPrice)) {
            setError('Instant buy price cannot be less than the starting price.');
            return;
        }
        // --- End Validation ---


        // Convert dates to Unix timestamps (seconds) for the smart contract
        const startTimeSeconds = Math.floor(startTime.getTime() / 1000);
        const endTimeSeconds = Math.floor(endTime.getTime() / 1000);

        onCreateAuction({
            tokenId: selectedTokenId,
            startPrice,
            startTime: startTimeSeconds,
            endTime: endTimeSeconds,     
            instantBuyPrice: instantBuyPrice || '0', 
        });
    };

     // Function to handle changes in the Start Time picker
    const handleStartTimeChange = (date) => {
        setStartTime(date);
        if (endTime && date && endTime <= date) {
            setEndTime(null);
        }
    };

    if (!show) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Schedule New Auction</h2>
                <button className="modal-close-button" onClick={onClose} disabled={loading}>×</button>
                <form onSubmit={handleSubmit}>
                    {/* NFT Selection */}
                    <div className="form-group">
                        <label htmlFor="nftSelect">Select Your NFT:</label>
                        <select
                            id="nftSelect"
                            value={selectedTokenId}
                            onChange={(e) => setSelectedTokenId(e.target.value)}
                            required
                            disabled={loading}
                        >
                            <option value="">-- Select Token ID --</option>
                            {ownedNFTs.map(nft => (
                                <option key={nft.tokenId} value={nft.tokenId}>
                                    Token ID: {nft.tokenId} {nft.name ? `- ${nft.name}` : ''}
                                </option>
                            ))}
                        </select>
                        {ownedNFTs.length === 0 && !loading && <p className="info-text">You don't own any NFTs eligible for auction.</p>}
                        {loading && ownedNFTs.length === 0 && <p className="info-text">Loading your NFTs...</p>}
                    </div>

                    {/* Starting Price */}
                    <div className="form-group">
                        <label htmlFor="startPrice">Starting Price (WBT):</label>
                        <input
                            type="number"
                            id="startPrice"
                            value={startPrice}
                            onChange={(e) => setStartPrice(e.target.value)}
                            placeholder="e.g., 0.1"
                            min="0.000000000000000001" 
                            step="any"
                            required
                            disabled={loading}
                        />
                    </div>

                     {/* Start Time Picker */}
                     <div className="form-group">
                        <label htmlFor="startTime">Start Time:</label>
                        <DatePicker
                            selected={startTime}
                            onChange={handleStartTimeChange} // Use custom handler
                            showTimeSelect
                            timeFormat="HH:mm" // 24-hour format
                            timeIntervals={15}
                            dateFormat="MMMM d, yyyy h:mm aa" // Display format with AM/PM
                            minDate={new Date()} // Prevent selecting past dates
                            placeholderText="Select start date and time"
                            required
                            disabled={loading}
                            id="startTime"
                            className="date-picker-input" 
                            popperPlacement="top-start"
                            autoComplete="off"
                        />
                    </div>

                    {/* End Time Picker */}
                    <div className="form-group">
                        <label htmlFor="endTime">End Time:</label>
                        <DatePicker
                            selected={endTime}
                            onChange={(date) => setEndTime(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="MMMM d, yyyy h:mm aa"
                            // End time must be after start time. Allow selection only if startTime is set.
                            minDate={startTime || new Date()} // Min date is start time (or now if start not set)
                            filterTime={(time) => { // Filter times on the same day as start time
                                if (startTime && time.toDateString() === startTime.toDateString()) {
                                    // Only allow times strictly after the start time
                                    return time.getTime() > startTime.getTime();
                                }
                                // Allow all times for future dates
                                return true;
                            }}
                            placeholderText="Select end date and time"
                            required
                            // Disable if loading or if startTime hasn't been selected yet
                            disabled={loading || !startTime}
                            id="endTime"
                            className="date-picker-input"
                            popperPlacement="top-start"
                            autoComplete="off"
                        />
                         {!startTime && <small className="info-text">Please select a start time first.</small>}
                    </div>


                    {/* Instant Buy Price (Optional) */}
                    <div className="form-group">
                        <label htmlFor="instantBuyPrice">Instant Buy Price (WBT, optional):</label>
                        <input
                            type="number"
                            id="instantBuyPrice"
                            value={instantBuyPrice}
                            onChange={(e) => setInstantBuyPrice(e.target.value)}
                            placeholder="e.g., 1.0 (leave empty for no instant buy)"
                             min="0" 
                            step="any"
                            disabled={loading}
                        />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="submit-button" disabled={loading}>
                        {loading ? 'Processing...' : 'Approve & Schedule Auction'}
                    </button>
                </form>
            </div>
        </div>
    );
}


// --- Main AuctionsPage Component ---
function AuctionsPage() {
    const { signer, isWalletConnected, address: currentWalletAddress } = useContext(Web3Context);
    const [activeAuctions, setActiveAuctions] = useState([]);
    const [endedAuctions, setEndedAuctions] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state for main page data
    const [error, setError] = useState(null); // Error for main page
    const [userRole, setUserRole] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [ownedNFTs, setOwnedNFTs] = useState([]); // NFTs owned by the SO user for the modal
    const [modalLoading, setModalLoading] = useState(false); // Loading state specifically for modal operations (NFT fetch, transaction)


    // --- Fetch User Role ---
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
                        setUserRole(null); // Reset role on failure
                    }
                } catch (err) {
                    console.error('Error fetching user role:', err);
                    setUserRole(null); // Reset role on error
                }
            } else {
                setUserRole(null); // No address, no role
            }
        }
        fetchUserRole();
    }, [currentWalletAddress]);


    // --- Fetch Auction Data ---
    const loadAuctions = useCallback(async () => {
        // Only set main loading true when initially loading or refreshing all
        if (activeAuctions.length === 0 && endedAuctions.length === 0) {
             setLoading(true);
        }
        setError(null);

        if (!isWalletConnected || !signer) {
             setLoading(false);
            return; // Need wallet connected
        }

        try {
            const factoryContract = new ethers.Contract(AUCTIONFACTORY_ADDRESS, AuctionFactoryABI, signer);
            const nftContract = new ethers.Contract(STUDENTNFT_ADDRESS, StudentNFTABI, signer); // For metadata

            // Fetch auction addresses
            const [activeAddresses, endedAddresses] = await Promise.all([
                factoryContract.getActiveAuctions(),
                factoryContract.getEndedAuctions()
            ]);

             // Helper to fetch full details for an auction address
            const fetchAuctionDetails = async (auctionAddress) => {
                 try {
                     const info = await factoryContract.getAuctionInfo(auctionAddress);

                     if (!info || !info.nftAddress || !info.tokenId || info.nftAddress.toLowerCase() !== STUDENTNFT_ADDRESS.toLowerCase()) {
                         console.warn(`Skipping invalid or non-matching auction data for ${auctionAddress}`);
                         return null;
                     }

                     // Fetch Metadata
                     let metadata = {};
                     let imageUri = '';
                     try {
                        const tokenURI = await nftContract.tokenURI(info.tokenId);
                        const processedUri = tokenURI.replace("ipfs://", "ipfs/"); 
                        const metadataResponse = await fetch(`http://localhost:8080/${processedUri}`); 
                        if (!metadataResponse.ok) throw new Error(`Failed to fetch metadata (status: ${metadataResponse.status}) for ${processedUri}`);
                        metadata = await metadataResponse.json();
                        if (metadata.image) {
                            imageUri = metadata.image.replace("ipfs://", "ipfs/"); 
                        }
                     } catch (metaErr) {
                         console.error(`Error fetching metadata for auction ${auctionAddress} (Token ID: ${info.tokenId}):`, metaErr);
                         metadata = { name: `Token ${info.tokenId}` };
                     }


                     // Fetch creator username
                     let creatorUsername = info.originalCreator;
                      try {
                          const usernameResponse = await fetch(`http://localhost:5000/api/auth/users/username/${info.originalCreator}`);
                          if (usernameResponse.ok) {
                              const usernameData = await usernameResponse.json();
                              creatorUsername = usernameData.username || info.originalCreator;
                          }
                      } catch (usernameError) {
                          console.error('Error fetching creator username:', usernameError);
                      }

                     return {
                         auctionAddress: auctionAddress, // Use the actual address from the list
                         nftAddress: info.nftAddress,
                         tokenId: Number(info.tokenId),
                         originalCreatorAddress: info.originalCreator,
                         originalCreator: creatorUsername, // Username or address
                         creationTime: Number(info.creationTime || 0),
                         startTime: Number(info.startTime || 0),     
                         endTime: Number(info.endTime || 0),       
                         metadata,
                         imageUri,
                     };
                 } catch (err) {
                     console.error(`Error fetching details for auction ${auctionAddress}:`, err);
                     return null; // Return null if fetching details fails for one auction
                 }
            };


            // Fetch details for all auctions concurrently
            const activeDetailsPromises = activeAddresses.map(fetchAuctionDetails);
            const endedDetailsPromises = endedAddresses.map(fetchAuctionDetails);

            const activeResults = await Promise.all(activeDetailsPromises);
            const endedResults = await Promise.all(endedDetailsPromises);

            // Filter out any null results from failed fetches and update state
            setActiveAuctions(activeResults.filter(details => details !== null));
            setEndedAuctions(endedResults.filter(details => details !== null));
            setError(null); // Clear previous errors on success

        } catch (err) {
            console.error('Error loading auctions:', err);
            setError(`Failed to load auctions: ${err.message || 'Check contract addresses and network.'}`);
            setActiveAuctions([]); // Clear data on error
            setEndedAuctions([]);
        } finally {
            setLoading(false);
        }
    }, [isWalletConnected, signer]); // Dependencies for useCallback

    // --- Load auctions on mount and when connection/signer changes ---
    useEffect(() => {
        loadAuctions();
    }, [loadAuctions]);


    
    // --- Fetch Owned NFTs for Modal ---
    const loadOwnedNFTsForModal = async () => {
        if (!signer || !currentWalletAddress) {
            console.log("Signer or wallet address missing. Cannot load NFTs.");
            setError("Please connect your wallet first.");
            return; 
        }
    
        setModalLoading(true); 
        setOwnedNFTs([]);      
        setError(null);        
    
        try {
            // Instantiate contracts
            const nftContract = new ethers.Contract(STUDENTNFT_ADDRESS, StudentNFTABI, signer);
            const factoryContract = new ethers.Contract(AUCTIONFACTORY_ADDRESS, AuctionFactoryABI, signer);
            const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer);
    
            // Fetch addresses of all active auctions from the factory
            const activeAuctionAddressesPromise = factoryContract.getActiveAuctions().catch(err => {
                console.error("Failed to fetch active auctions:", err);
                return [];
            });
    
            //Fetch all active listings from the marketplace contract
            const allActiveListingsPromise = marketplaceContract.getAllActiveListings().catch(err => {
                console.error("Failed to fetch active listings from marketplace:", err);
                return [];
            });
    
            const [activeAuctionAddresses, allActiveListings] = await Promise.all([
                activeAuctionAddressesPromise,
                allActiveListingsPromise
            ]);
    

            const auctionInfoPromises = activeAuctionAddresses.map(addr =>
                factoryContract.getAuctionInfo(addr).catch(err => {
                    console.warn(`Could not get auction info for address ${addr}:`, err);
                    return null; 
                })
            );

            const auctionInfosUnfiltered = await Promise.all(auctionInfoPromises);
            const auctionInfos = auctionInfosUnfiltered.filter(info => info !== null);
            const lockedTokenIds = new Set(auctionInfos.map(info => Number(info.tokenId)));
            console.log("Token IDs locked in auctions:", lockedTokenIds);
    
            //Process Marketplace Listing Data 
            const listedTokenIds = new Set();
            allActiveListings.forEach(listing => {
                if (listing.nftContractAddress.toLowerCase() === STUDENTNFT_ADDRESS.toLowerCase()) {
                     listedTokenIds.add(Number(listing.tokenId));
                }
            });
            console.log(`Token IDs listed on Marketplace (for NFT ${STUDENTNFT_ADDRESS}):`, listedTokenIds);
    
            // --- Fetch and Filter User's Owned NFTs ---
    
            //Get the total supply of the NFT collection to know the upper bound for checking tokens
            const totalSupplyBigInt = await nftContract.totalSupply();
            const totalSupply = Number(totalSupplyBigInt); 
            console.log('Total NFT Supply:', totalSupply);
    
            // Iterate through all possible token IDs 
            const ownedNftCheckPromises = []; 
            const startIndex = 1; 
    
            for (let i = startIndex; i <= totalSupply; i++) {
                const tokenId = i;
    
                // --- Filtering Logic ---
                if (lockedTokenIds.has(tokenId)) {
                    continue; 
                }
    
                if (listedTokenIds.has(tokenId)) {
                    continue; 
                }
    
                ownedNftCheckPromises.push((async () => {
                    try {
                        const owner = await nftContract.ownerOf(tokenId);

                        if (owner.toLowerCase() === currentWalletAddress.toLowerCase()) {
                            return {
                                tokenId: tokenId,
                                name: `Token ${tokenId}` 
                            };
                        } else {
                            return null;
                        }
                    } catch (ownerError) {
                        if (ownerError.code === 'CALL_EXCEPTION' || (ownerError.message && ownerError.message.includes('nonexistent token'))) {
                        } else {
                           console.warn(`Error checking owner/existence for token ${tokenId}:`, ownerError);
                        }
                        return null;
                    }
                })()); 
            } 
  
            const results = await Promise.all(ownedNftCheckPromises);

            const finalOwnedNFTs = results.filter(nft => nft !== null);
    
            console.log("Final list of available owned NFTs for modal:", finalOwnedNFTs);
            setOwnedNFTs(finalOwnedNFTs);
    
        } catch (error) {
            console.error("Error loading owned NFTs for modal:", error);
            setError("Failed to load your available NFTs. Please check the console for details or try again later.");
            setOwnedNFTs([]); 
        } finally {
            setModalLoading(false); 
        }
    };
    


    // --- Handle Opening the Create Modal ---
    const handleOpenCreateModal = () => {
        setError(null); // Clear any previous errors
        setShowCreateModal(true);
        loadOwnedNFTsForModal(); // Load NFTs when modal opens
    };

    // --- Handle Auction Creation (Using Start/End Timestamps) ---
    const handleCreateAuction = async ({ tokenId, startPrice, startTime, endTime, instantBuyPrice }) => {
        if (!signer || !currentWalletAddress) {
            setError('Wallet not connected or signer not available.');
            return;
        }
        setModalLoading(true);
        setError(null); // Clear previous errors when starting transaction

        try {
            const factoryContract = new ethers.Contract(AUCTIONFACTORY_ADDRESS, AuctionFactoryABI, signer);
            const nftContract = new ethers.Contract(STUDENTNFT_ADDRESS, StudentNFTABI, signer);

            // Approve the Factory to transfer this specific NFT
            console.log(`Approving Factory (${AUCTIONFACTORY_ADDRESS}) for NFT Token ID: ${tokenId}...`);
            const approvalTx = await nftContract.approve(AUCTIONFACTORY_ADDRESS, tokenId);
            const approvalReceipt = await approvalTx.wait();
            console.log('Approval successful:', approvalReceipt.hash);

            
            const startPriceWei = ethers.parseEther(startPrice);
            const instantBuyPriceWei = ethers.parseEther(instantBuyPrice); 

           
            console.log(`Creating auction for Token ID: ${tokenId} starting at ${new Date(startTime * 1000)} ending at ${new Date(endTime * 1000)}...`);
            console.log(`Params: NFT=${STUDENTNFT_ADDRESS}, TokenId=${tokenId}, StartTime=${startTime}, EndTime=${endTime}, InstantBuyWei=${instantBuyPriceWei.toString()}, StartPriceWei=${startPriceWei.toString()}`);

            const createTx = await factoryContract.createAuction(
                STUDENTNFT_ADDRESS,
                tokenId,
                startTime,          // Pass start timestamp (uint256)
                endTime,            // Pass end timestamp (uint256)
                instantBuyPriceWei, // Check order
                startPriceWei       // Check order
            );
            console.log('Auction creation transaction sent:', createTx.hash);
            const createReceipt = await createTx.wait();
            console.log('Auction created successfully!', createReceipt);

            alert(`Auction for NFT Token ID ${tokenId} scheduled successfully!`);
            setShowCreateModal(false); // Close modal on success
            loadAuctions(); // Refresh the auction lists

        } catch (err) {
            console.error('Error creating auction:', err);
            let userMessage = 'Failed to schedule auction. ';
             if (err.code === 'ACTION_REJECTED') {
                 userMessage += 'Transaction was rejected.';
             } else if (err.reason) { 
                 userMessage += `Transaction failed: ${err.reason}`;
             } else if (err.message?.includes('insufficient funds')) {
                 userMessage += 'Insufficient funds for gas.';
             } else if (err.message?.includes('ERC721: transfer caller is not owner nor approved') || err.message?.includes('caller is not token owner nor approved') ) {
                 userMessage += 'NFT Approval failed or was revoked.';
             } else {
                 userMessage += 'Please check browser console logs for details.';
             }
             setError(userMessage); // This will display error on the main page after modal closes on error
        } finally {
            setModalLoading(false);
        }
    };


    // --- Render Logic ---
    if (!isWalletConnected) {
        return <div className="container status-message">Please connect your wallet to view auctions.</div>;
    }

    // Initial loading state
    if (loading && activeAuctions.length === 0 && endedAuctions.length === 0) {
        return <div className="container status-message">Loading auctions...</div>;
    }

     // Display general error 
     if (error && (!showCreateModal || !modalLoading)) {
         return <div className="container error-message">Error: {error} <button onClick={loadAuctions}>Retry</button></div>;
     }


    // Helper function to format time
    const formatTime = (timestamp) => {
        if (!timestamp || timestamp <= 0) return 'N/A';
        try {
            return new Date(timestamp * 1000).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    }

    return (
        <div className="auctions-page">
            <h1 className="page-title">NFT Auctions</h1>

            {/* Button to open the modal - only for specific role */}
            {userRole === 'student organization' && (
                <button
                    className="start-auction-button"
                    onClick={handleOpenCreateModal}
                    disabled={modalLoading} // Disable only if modal is busy
                >
                    Start Auction
                </button>
            )}

            {/* --- Create Auction Modal --- */}
            <CreateAuctionModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                ownedNFTs={ownedNFTs}
                onCreateAuction={handleCreateAuction} 
                loading={modalLoading} 
            />

            {/* --- Active Auctions Section --- */}
            <section className="auction-section">
                <h2>Active Auctions</h2>
                {loading && <p>Refreshing active auctions...</p>}
                {!loading && activeAuctions.length === 0 && <p>No active auctions found.</p>}
                {!loading && activeAuctions.length > 0 && (
                    <div className="auction-grid">
                        {activeAuctions.map((auction) => (
                            <div key={auction.auctionAddress} className="auction-card">
                                {auction.imageUri ? (
                                    <img
                                        src={`http://localhost:8080/${auction.imageUri}`} 
                                        alt={auction.metadata?.name || `Token ID ${auction.tokenId}`}
                                        className="auction-image"
                                        onError={(e) => { e.target.style.display = 'none'; /* Hide image on error */ }}
                                    />
                                ) : (
                                    <div className="auction-image-placeholder">No Image</div>
                                )}
                                <h3 className="auction-name">{auction.metadata?.name || `Token ID: ${auction.tokenId}`}</h3>
                                <p className="auction-detail">Token ID: {auction.tokenId}</p>
                                <p className="auction-detail">Creator: {auction.originalCreator}</p>
                                <p className="auction-detail">Starts: {formatTime(auction.startTime)}</p>
                                <p className="auction-detail">Ends: {formatTime(auction.endTime)}</p>
                                <Link to={`/auction/${auction.auctionAddress}`} className="view-button">
                                    View Auction
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* --- Ended Auctions Section --- */}
            <section className="auction-section">
                <h2>Ended Auctions</h2>
                 {loading && <p>Refreshing ended auctions...</p>}
                 {!loading && endedAuctions.length === 0 && <p>No ended auctions found.</p>}
                 {!loading && endedAuctions.length > 0 && (
                    <div className="auction-grid ended"> 
                        {endedAuctions.map((auction) => (
                             <div key={auction.auctionAddress} className="auction-card">
                                {auction.imageUri ? (
                                    <img
                                        src={`http://localhost:8080/${auction.imageUri}`}
                                        alt={auction.metadata?.name || `Token ID ${auction.tokenId}`}
                                        className="auction-image"
                                         onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                 ) : (
                                    <div className="auction-image-placeholder">No Image</div>
                                )}
                                <h3 className="auction-name">{auction.metadata?.name || `Token ID: ${auction.tokenId}`}</h3>
                                <p className="auction-detail">Token ID: {auction.tokenId}</p>
                                <p className="auction-detail">Creator: {auction.originalCreator}</p>
                                <p className="auction-detail">Started: {formatTime(auction.startTime)}</p>
                                <p className="auction-detail">Ended: {formatTime(auction.endTime)}</p>
                                <Link to={`/auction/${auction.auctionAddress}`} className="view-button">
                                    View Details
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default AuctionsPage;