import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Web3Context } from '../context/Web3Context';
import StudentNFTABI from '../contracts/StudentNFT.json'; 
import AuctionFactoryABI from '../contracts/AuctionFactory.json';
import AuctionABI from '../contracts/Auction.json'; 
import '../styles/AuctionDetailsPage.css'; 

const STUDENTNFT_ADDRESS = '0x1b8758C7abE4fe288a3Eee9f117eCFa6Aaee3E9a';
const AUCTIONFACTORY_ADDRESS = '0xC62913442474811a22A24A173f9Ac48e56c605A4';

const AuctionState = {
    Open: 0,
    Ended: 1,
    Cancelled: 2,
    InstantBuy: 3,
};

// Helper function to map AuctionState enum to readable string
const getAuctionStateString = (stateEnum) => {
    switch (stateEnum) {
        case AuctionState.Open: return 'Open';
        case AuctionState.Ended: return 'Ended'; // Covers both time end and instant buy completion based on contract logic
        case AuctionState.Cancelled: return 'Cancelled';
        case AuctionState.InstantBuy: return 'Ended (Instant Buy)'; // Contract emits Ended event on instant buy
        default: return 'Unknown';
    }
};


// Helper function to format time (seconds timestamp)
const formatTime = (timestamp) => {
    if (!timestamp || timestamp <= 0) return 'N/A';
    try {
        const date = new Date(Number(timestamp) * 1000);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
    } catch (e) {
        return 'Invalid Date';
    }
};

// Helper function to format Ether amounts
const formatEth = (weiValue) => {
    if (weiValue === undefined || weiValue === null) return 'N/A';
    try {
        return ethers.formatEther(weiValue);
    } catch (e) {
        console.error("Error formatting Ether:", e);
        return 'Error';
    }
};


function AuctionDetailsPage() {
    const { auctionAddress } = useParams(); // Get auction address from URL
    console.log("Auction Address from URL:", auctionAddress);
    const { signer, isWalletConnected, address: currentWalletAddress } = useContext(Web3Context);
    const navigate = useNavigate();

    // --- State ---
    const [auctionDetails, setAuctionDetails] = useState({
        nftAddress: '',
        tokenId: null,
        originalCreator: '',
        startTime: 0,
        endTime: 0,
        instantBuyPrice: 0n,
        startPrice: 0n,
        highestBidder: null,
        highestBid: 0n,
        isCancelled: false, 
        isInstantBuy: false, 
        auctionState: null, 
    });
    const [nftMetadata, setNftMetadata] = useState(null);
    const [imageUri, setImageUri] = useState('');
    const [creatorUsername, setCreatorUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [currentBlockTimestamp, setCurrentBlockTimestamp] = useState(Math.floor(Date.now() / 1000));
    const [nftOwner, setNftOwner] = useState(null); // Track current NFT owner
    const [factoryNotified, setFactoryNotified] = useState(null);

    // --- Fetch Current Block Timestamp ---
    const fetchCurrentBlockTimestamp = useCallback(async () => {
        if (!signer?.provider) return; // Ensure provider exists
        try {
            // Use provider directly for getBlock
            const block = await signer.provider.getBlock('latest');
            if (block && block.timestamp) {
                setCurrentBlockTimestamp(block.timestamp);
                console.log("Fetched block timestamp:", block.timestamp, new Date(block.timestamp * 1000));
            } else {
                 setCurrentBlockTimestamp(Math.floor(Date.now() / 1000));
                 console.warn("Could not fetch block timestamp from provider, using system time.");
            }
        } catch (err) {
            console.error("Error fetching block timestamp:", err);
            setCurrentBlockTimestamp(Math.floor(Date.now() / 1000));
        }
    }, [signer]);


    // --- Fetch Auction Data ---
    const loadAuctionDetails = useCallback(async () => {
        if (!signer || !auctionAddress || !ethers.isAddress(auctionAddress)) {
            setError("Invalid Auction Address or Wallet not connected.");
            console.log("Auction address:", auctionAddress);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Instantiate contracts
            console.log("Loading auction details for address:", auctionAddress);
            console.log("AuctionAbi:", AuctionABI);
            const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, signer);
            const nftContract = new ethers.Contract(STUDENTNFT_ADDRESS, StudentNFTABI, signer);

            // Fetch data from Auction contract concurrently
            const [
                nftAddr,
                tokenIdBigInt,
                creator,
                startTimeBigInt,
                endTimeBigInt,
                instantBuyPriceWei,
                startPriceWei,
                highestBidderAddr,
                highestBidWei,
                isCancelledBool,
                isInstantBuyBool,
                auctionStateEnum,
            ] = await Promise.all([
                auctionContract.nft(), 
                auctionContract.tokenId(),
                auctionContract.originalCreator(), 
                auctionContract.startTime(),
                auctionContract.endTime(),
                auctionContract.instantBuyPrice(),
                auctionContract.startPrice(),
                auctionContract.highestBidder(),
                auctionContract.highestBid(),
                auctionContract.isCancelled(), 
                auctionContract.isInstantBuy(), 
                auctionContract.getAuctionState(), 
            ]).catch(err => {
                 console.error("Error fetching batch auction details:", err);
                 throw new Error(`Failed to fetch details from auction contract ${auctionAddress}. Check ABI and contract deployment.`);
            });

            const tokenId = Number(tokenIdBigInt);

            // Fetch current owner of the NFT to determine if auction has truly started (NFT transferred)
            let currentNftOwner = null;
            try {
                currentNftOwner = await nftContract.ownerOf(tokenId);
                setNftOwner(currentNftOwner);
                console.log(`Current owner of token ${tokenId}: ${currentNftOwner}`);
            } catch (ownerError) {
                 console.warn(`Could not fetch owner for token ${tokenId} (might be burned or error):`, ownerError);
            }


            // Basic Validation
            if (nftAddr.toLowerCase() !== STUDENTNFT_ADDRESS.toLowerCase()) {
                throw new Error(`Auction NFT address (${nftAddr}) does not match expected NFT contract (${STUDENTNFT_ADDRESS}).`);
            }

            const details = {
                nftAddress: nftAddr,
                tokenId: tokenId,
                originalCreator: creator,
                startTime: Number(startTimeBigInt),
                endTime: Number(endTimeBigInt),
                instantBuyPrice: instantBuyPriceWei,
                startPrice: startPriceWei,
                highestBidder: highestBidderAddr === ethers.ZeroAddress ? null : highestBidderAddr,
                highestBid: highestBidWei,
                isCancelled: isCancelledBool,
                isInstantBuy: isInstantBuyBool,
                auctionState: Number(auctionStateEnum), 
            };
            setAuctionDetails(details);
            console.log("Auction Details Raw State:", details);
            console.log("Auction State Enum:", details.auctionState, "Mapped:", getAuctionStateString(details.auctionState));


            // Fetch NFT Metadata
            if (!nftMetadata || nftMetadata.tokenId !== tokenId) {
                 try {
                    const tokenURI = await nftContract.tokenURI(tokenId);
                    const processedUri = tokenURI.replace("ipfs://", "ipfs/");
                    const metadataResponse = await fetch(`http://localhost:8080/${processedUri}`); 
                    if (!metadataResponse.ok) throw new Error(`Metadata fetch failed (${metadataResponse.status})`);
                    const meta = await metadataResponse.json();
                    setNftMetadata({...meta, tokenId: tokenId}); 
                    if (meta.image) {
                        setImageUri(meta.image.replace("ipfs://", "ipfs/"));
                    }
                    console.log("NFT Metadata:", meta);
                } catch (metaErr) {
                    console.error(`Failed to fetch metadata for token ${tokenId}:`, metaErr);
                    setNftMetadata({ name: `Token ${tokenId}`, tokenId: tokenId }); // Fallback
                    setImageUri(''); // Clear image on error
                }
            }


            // Fetch Creator Username (Optional)
             if (!creatorUsername || auctionDetails.originalCreator !== creator) { // Fetch only if needed
                 try {
                   const usernameResponse = await fetch(`http://localhost:5000/api/auth/users/username/${creator}`);
                   if (usernameResponse.ok) {
                     const usernameData = await usernameResponse.json();
                     setCreatorUsername(usernameData.username || creator);
                   } else { setCreatorUsername(creator); }
                 } catch (usernameError) {
                   console.error('Error fetching creator username:', usernameError);
                   setCreatorUsername(creator);
                 }
             }


            // Fetch current block time to compare against start/end times
            await fetchCurrentBlockTimestamp();


        } catch (err) {
            console.error('Error loading auction details:', err);
            setError(`Failed to load auction: ${err.message || 'Please check the auction address and network.'}`);
            // setAuctionDetails(initialState);
            // setNftMetadata(null);
        } finally {
            setLoading(false);
        }
    }, [auctionAddress, signer, fetchCurrentBlockTimestamp, nftMetadata, creatorUsername]); 

    // --- Load details on mount or when signer/address changes ---
    useEffect(() => {
        loadAuctionDetails();
    }, [loadAuctionDetails]);

     // --- Refresh Button ---
     const handleRefresh = () => {
         setError(null); // Clear error before retrying
         setNftMetadata(null);
         setCreatorUsername('');
         fetchCurrentBlockTimestamp(); // Update time first
         loadAuctionDetails(); // Reload all data
     };

    const auctionStatusString = auctionDetails.auctionState !== null ? getAuctionStateString(auctionDetails.auctionState) : 'Loading...';
    const isCreator = currentWalletAddress && auctionDetails.originalCreator && currentWalletAddress.toLowerCase() === auctionDetails.originalCreator.toLowerCase();
    const isHighestBidder = currentWalletAddress && auctionDetails.highestBidder && currentWalletAddress.toLowerCase() === auctionDetails.highestBidder.toLowerCase();
    const isNftInContract = nftOwner && nftOwner.toLowerCase() === auctionAddress?.toLowerCase();


    // --- Action Handlers ---

    const handleStartAuction = async () => {
        // Condition: User is creator, auction is 'Open', time is past start, NFT NOT yet in contract
        if (!signer || !auctionDetails || actionLoading || !isCreator) return;
        if (auctionDetails.auctionState !== AuctionState.Open) {
            setError("Auction is not in an Open state.");
            return;
        }
        if (currentBlockTimestamp < auctionDetails.startTime) {
             setError("Auction cannot be started before its scheduled start time.");
             return;
         }
         if (isNftInContract) {
             setError("Auction appears to have already been started (NFT is in contract).");
             return;
         }

        setActionLoading(true);
        setError(null);
        try {
            // 1. Get NFT Contract instance
            const nftContract = new ethers.Contract(STUDENTNFT_ADDRESS, StudentNFTABI, signer);

            // 2. Approve the specific Auction contract instance to transfer the NFT
            console.log(`Approving Auction contract (${auctionAddress}) for NFT Token ID: ${auctionDetails.tokenId}...`);
            const approvalTx = await nftContract.approve(auctionAddress, auctionDetails.tokenId);
            console.log("Approval transaction sent:", approvalTx.hash);
            // Wait for the approval transaction to be mined
            const approvalReceipt = await approvalTx.wait();
            console.log("Approval successful:", approvalReceipt.hash);

            // 3. call startAuction on the Auction contract
            const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, signer);
            console.log("Attempting to start auction by transferring NFT...");
            const startTx = await auctionContract.startAuction(auctionDetails.originalCreator);
            console.log("Start auction transaction sent:", startTx.hash);
            const startReceipt = await startTx.wait();
            console.log("Start auction successful (NFT transferred):", startReceipt);

            alert("Approval successful and Auction started! NFT transferred to contract.");
            // Refresh data to reflect new state and NFT owner
            loadAuctionDetails();

        } catch (err) {
            console.error("Error during auction start process:", err);
            const reason = err.reason || err.data?.message || err.message || "Unknown error";
             if (reason.includes("transfer caller is not owner nor approved")) {
                setError("NFT Transfer Error: Approval might have failed or the wrong address was approved.");
             } else if (reason.includes("Start time is not reached yet")) {
                 setError("Failed to start: Start time not yet reached according to blockchain time.");
             } else if (err.code === 'ACTION_REJECTED') {
                 setError("Transaction rejected (Approval or Start).");
             }
             else {
                setError(`Failed to start auction: ${reason}`);
             }
        } finally {
            setActionLoading(false);
        }
    };

    const handlePlaceBid = async () => {
        if (!signer || !auctionDetails || actionLoading) return;
        if (!bidAmount || isNaN(parseFloat(bidAmount)) || parseFloat(bidAmount) <= 0) {
            setError("Please enter a valid bid amount greater than 0.");
            return;
        }
        if (isCreator) {
             setError("The auction creator cannot place bids.");
             return;
        }
        if (auctionDetails.auctionState !== AuctionState.Open) {
             setError("Bids can only be placed when the auction is Open.");
             return;
         }
         if (!isNftInContract) {
             setError("Cannot bid yet: Auction has not been formally started (NFT not transferred).");
             return;
         }


        setActionLoading(true);
        setError(null);
        try {
            const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, signer);
            const bidAmountWei = ethers.parseEther(bidAmount);
            const minBidWei = auctionDetails.highestBid > 0n ? auctionDetails.highestBid : auctionDetails.startPrice;
            if (bidAmountWei <= minBidWei) {
                throw new Error(`Bid must be higher than the current highest bid (${formatEth(auctionDetails.highestBid)} WBT) or start price (${formatEth(auctionDetails.startPrice)} WBT).`);
            }
             if (auctionDetails.instantBuyPrice > 0n && bidAmountWei > auctionDetails.instantBuyPrice) {
                console.warn("Bid amount exceeds instant buy price. Consider using Instant Buy.");
            }


            console.log(`Placing bid of ${bidAmount} WBT (${bidAmountWei.toString()} wei)...`);
            const tx = await auctionContract.placeBid({ value: bidAmountWei });
            console.log("Place bid transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Place bid successful:", receipt);
            alert(`Bid of ${bidAmount} WBT placed successfully!`);
            setBidAmount(''); 
            loadAuctionDetails(); 
        } catch (err) {
            console.error("Error placing bid:", err);
             const reason = err.reason || err.data?.message || err.message || "Unknown error";
             if (reason.includes("insufficient funds")) { setError("Bid failed: Insufficient funds."); }
             else if (reason.includes("Bid must be at least")) { setError(`Bid failed: ${reason}`);} 
             else if (reason.includes("Auction has already ended")) { setError("Bid failed: Auction has ended.");}
             else { setError(`Failed to place bid: ${reason}`); }
        } finally {
            setActionLoading(false);
        }
    };

     const handleInstantBuy = async () => {
         if (!signer || !auctionDetails || actionLoading || auctionDetails.instantBuyPrice <= 0n) return;
         if (isCreator) {
             setError("The auction creator cannot use instant buy.");
             return;
         }
          if (auctionDetails.auctionState !== AuctionState.Open) {
             setError("Instant buy is only available when the auction is Open.");
             return;
         }
          if (!isNftInContract) {
             setError("Cannot buy yet: Auction has not been formally started (NFT not transferred).");
             return;
         }

         setActionLoading(true);
         setError(null);
         try {
             const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, signer);
             const instantBuyPriceWei = auctionDetails.instantBuyPrice;

             console.log(`Attempting instant buy for ${formatEth(instantBuyPriceWei)} WBT...`);
             const tx = await auctionContract.instantBuy({ value: instantBuyPriceWei });
             console.log("Instant buy transaction sent:", tx.hash);
             const receipt = await tx.wait();
             console.log("Instant buy successful:", receipt);
             alert(`NFT purchased successfully for ${formatEth(instantBuyPriceWei)} WBT!`);
             loadAuctionDetails(); // Refresh data
         } catch (err) {
             console.error("Error during instant buy:", err);
             const reason = err.reason || err.data?.message || err.message || "Unknown error";
              if (reason.includes("insufficient funds")) { setError("Instant Buy failed: Insufficient funds."); }
              else if (reason.includes("Exact instant buy price is required")) { setError("Instant Buy failed: Incorrect amount sent.");}
              else if (reason.includes("Instant buy price already reached")) { setError("Instant Buy failed: Price already met or exceeded by a bid.");}
              else { setError(`Instant Buy failed: ${reason}`); }
         } finally {
             setActionLoading(false);
         }
     };

    const handleWithdrawToken = async () => { 
         if (!signer || !auctionDetails || actionLoading) return;
         if (!isHighestBidder) { // Check if current user is the winner
             setError("Only the winning bidder can withdraw the NFT.");
             return;
         }
         // Check if auction is in a state where withdrawal is allowed
         const currentState = auctionDetails.auctionState;
         if (currentState !== AuctionState.Ended && currentState !== AuctionState.InstantBuy) {
             setError("NFT can only be withdrawn after the auction has ended successfully.");
             return;
         }
         // Check if NFT is still in the contract (hasn't been withdrawn yet)
         if (!isNftInContract) {
             setError("NFT has already been withdrawn or is not held by the auction contract.");
             return;
         }


        setActionLoading(true);
        setError(null);
        try {
            const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, signer);
            console.log("Attempting to withdraw NFT...");
            const tx = await auctionContract.withdrawToken();
            console.log("Withdraw NFT transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Withdraw NFT successful:", receipt);
            alert("NFT withdrawn successfully! Check your wallet.");
            loadAuctionDetails(); 
        } catch (err) {
            console.error("Error withdrawing NFT:", err);
            const reason = err.reason || err.data?.message || err.message || "Unknown error";
             if (reason.includes("Auction is not yet over")) { setError("Withdrawal failed: Auction hasn't ended.");}
             else if (reason.includes("Only the highest bidder")) { setError("Withdrawal failed: You are not the highest bidder.");}
             else if (reason.includes("Auction contract does not own the NFT")) { setError("Withdrawal failed: NFT not found in contract (already withdrawn?).");}
             else { setError(`Failed to withdraw NFT: ${reason}`); }
        } finally {
            setActionLoading(false);
        }
    };

     const handleWithdrawFunds = async () => { 
         if (!signer || !auctionDetails || actionLoading) return;
         if (!isCreator) {
             setError("Only the auction creator can withdraw funds.");
             return;
         }
         const currentState = auctionDetails.auctionState;
         if (currentState !== AuctionState.Ended && currentState !== AuctionState.InstantBuy) {
             setError("Funds can only be withdrawn after the auction has ended successfully.");
             return;
         }
          if (auctionDetails.highestBid <= 0n) {
             setError("No funds to withdraw (no successful bids).");
             return;
         }

        setActionLoading(true);
        setError(null);
        try {
            const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, signer);
            console.log("Attempting to withdraw funds...");
            const tx = await auctionContract.withdrawFunds();
            console.log("Withdraw funds transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Withdraw funds successful:", receipt);
            alert("Funds withdrawn successfully!");
            loadAuctionDetails(); 
        } catch (err) {
            console.error("Error withdrawing funds:", err);
            const reason = err.reason || err.data?.message || err.message || "Unknown error";
             if (reason.includes("Auction is not yet over")) { setError("Withdrawal failed: Auction hasn't ended.");}
             else if (reason.includes("No bids were placed")) { setError("Withdrawal failed: No bids were placed.");}
             else if (reason.includes("Funds withdrawal failed")) { setError("Withdrawal failed: Transaction reverted internally.");}
             else { setError(`Failed to withdraw funds: ${reason}`); }
        } finally {
            setActionLoading(false);
        }
    };

     const handleCancelAuction = async () => {
         if (!signer || !auctionDetails || actionLoading) return;
         if (!isCreator) {
             setError("Only the auction creator can cancel the auction.");
             return;
         }
         if (auctionDetails.auctionState === AuctionState.Cancelled) {
             setError("Auction has already been cancelled.");
             return;
         }
         if (auctionDetails.auctionState !== AuctionState.Open) {
             setError("Auction cannot be cancelled once it has ended or been bought.");
             return;
         }

        setActionLoading(true);
        setError(null);
        try {
            const auctionContract = new ethers.Contract(auctionAddress, AuctionABI, signer);
            console.log("Attempting to cancel auction...");
            const tx = await auctionContract.cancelAuction();
            console.log("Cancel auction transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Cancel auction successful:", receipt);
            alert("Auction cancelled successfully! NFT returned and bidder refunded (if any).");
            loadAuctionDetails(); 
        } catch (err) {
            console.error("Error cancelling auction:", err);
             const reason = err.reason || err.data?.message || err.message || "Unknown error";
             if (reason.includes("Auction has already been cancelled")) { setError("Cancellation failed: Already cancelled.");}
             else { setError(`Failed to cancel auction: ${reason}`); }
        } finally {
            setActionLoading(false);
        }
    };


const handleMarkFactoryEnded = async () => {
    if (!signer || !auctionDetails || !isCreator || actionLoading || !factoryContract) {
         setError("Cannot mark ended: Conditions not met or factory contract not ready.");
         return;
    }
    if (auctionDetails.auctionState !== AuctionState.Ended && auctionDetails.auctionState !== AuctionState.InstantBuy) {
        setError("Cannot mark ended in factory: Auction state is not Ended or InstantBuy.");
        return;
    }


    setActionLoading(true);
    setError(null);
    try {
        // Instantiate Factory Contract
        const factoryContract = new ethers.Contract(AUCTIONFACTORY_ADDRESS, AuctionFactoryABI, signer); 

        console.log(`Notifying factory to mark auction ${auctionAddress} as ended...`);
        const tx = await factoryContract.markAuctionEnded(auctionAddress);
        console.log("Mark factory ended transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Factory marked ended successfully:", receipt);
        alert("Successfully notified factory that the auction has ended.");
        // setFactoryNotified(true);
        loadAuctionDetails(); 

    } catch (err) {
        console.error("Error marking auction ended in factory:", err);
        const reason = err.reason || err.data?.message || err.message || "Unknown error";
         if (reason.includes("Auction is not active")) {
             setError("Factory Error: Auction is already marked as inactive.");
             // setFactoryNotified(true); 
         } else if (reason.includes("Only the original auction creator can call this")) {
             setError("Factory Error: You are not the creator of this auction.");
         } else {
             setError(`Failed to mark ended in factory: ${reason}`);
         }
    } finally {
        setActionLoading(false);
    }
};

const handleMarkFactoryCancelled = async () => {
    if (!signer || !auctionDetails || !isCreator || actionLoading || !factoryContract) {
         setError("Cannot mark cancelled: Conditions not met or factory contract not ready.");
        return;
    }
    if (auctionDetails.auctionState !== AuctionState.Cancelled) {
        setError("Cannot mark cancelled in factory: Auction state is not Cancelled.");
        return;
    }


    setActionLoading(true);
    setError(null);
    try {
        // Instantiate Factory Contract
        const factoryContract = new ethers.Contract(AUCTIONFACTORY_ADDRESS, AuctionFactoryABI, signer); 

        console.log(`Notifying factory to mark auction ${auctionAddress} as cancelled...`);
        const tx = await factoryContract.markAuctionCancelled(auctionAddress);
        console.log("Mark factory cancelled transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Factory marked cancelled successfully:", receipt);
        alert("Successfully notified factory that the auction was cancelled.");
        // setFactoryNotified(true); 
        loadAuctionDetails();

    } catch (err) {
        console.error("Error marking auction cancelled in factory:", err);
        const reason = err.reason || err.data?.message || err.message || "Unknown error";
         if (reason.includes("Auction is not active")) {
             setError("Factory Error: Auction is already marked as inactive.");
              // setFactoryNotified(true);
         } else if (reason.includes("Only the original auction creator can call this")) {
             setError("Factory Error: You are not the creator of this auction.");
         } else {
             setError(`Failed to mark cancelled in factory: ${reason}`);
         }
    } finally {
        setActionLoading(false);
    }
};

const [factoryContract, setFactoryContract] = useState(null);
useEffect(() => {
    if (signer && AUCTIONFACTORY_ADDRESS) {
        const instance = new ethers.Contract(AUCTIONFACTORY_ADDRESS, AuctionFactoryABI, signer);
        setFactoryContract(instance);
    } else {
        setFactoryContract(null);
    }
}, [signer]);


    // --- Render Logic ---
    if (loading) {
        return <div className="container status-message">Loading Auction Details...</div>;
    }
     if (error && !actionLoading) { 
        return (
            <div className="container error-message">
                Error: {error}
                <button onClick={handleRefresh} className="retry-button">Retry</button>
                <Link to="/auctions" className="back-link">Back to Auctions</Link>
            </div>
        );
    }

    if (!auctionDetails.nftAddress) { 
        return (
            <div className="container status-message">
                Auction not found or could not be loaded. Was the address correct?
                <Link to="/auctions" className="back-link">Back to Auctions</Link>
            </div>
         );
    }

    const showStartButton = isCreator &&
                            auctionDetails.auctionState === AuctionState.Open &&
                            currentBlockTimestamp >= auctionDetails.startTime &&
                            !isNftInContract; // Key condition: NFT not yet transferred

    return (
        <div className="auction-details-page container">
             <Link to="/auctions" className="back-link top-link">Back to Auctions</Link>
            <h1>Auction: {nftMetadata?.name || `Token ID ${auctionDetails.tokenId}`}</h1>
             <button onClick={handleRefresh} disabled={loading || actionLoading} className="refresh-button">
                 Refresh Data
             </button>

            <div className="details-layout">
                {/* Left Column: Image & Metadata */}
                <div className="details-image-container">
                    {imageUri ? (
                        <img
                            src={`http://localhost:8080/${imageUri}`}
                            alt={nftMetadata?.name || `Token ID ${auctionDetails.tokenId}`}
                            className="details-nft-image"
                            onError={(e) => { e.target.src = 'https://placehold.co/300x300/eee/ccc?text=Image+Error'; }} // Placeholder on error
                        />
                    ) : (
                         <img
                            src={`https://placehold.co/300x300/eee/ccc?text=No+Image`}
                            alt="Placeholder"
                            className="details-nft-image"
                         />
                    )}
                     {nftMetadata?.description && <p className="nft-description">{nftMetadata.description}</p>}
                    {nftMetadata?.attributes?.length > 0 && (
                        <div className="nft-attributes">
                            <h4>Attributes:</h4>
                            <ul>
                                {nftMetadata.attributes.map((attr, index) => (
                                    <li key={index}><strong>{attr.trait_type || 'Attribute'}:</strong> {attr.value}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Right Column: Auction Info & Actions */}
                <div className="details-info-container">
                    <h2>Details</h2>
                     {/* Use state string for display */}
                     <p><strong>Status:</strong> <span className={`status-${auctionStatusString.toLowerCase().split(' ')[0]}`}>{auctionStatusString}</span></p>
                     {!isNftInContract && auctionDetails.auctionState === AuctionState.Open && currentBlockTimestamp >= auctionDetails.startTime && <p className='info-text small status-warning'>Waiting for creator to start (transfer NFT).</p>}
                     <p><strong>Token ID:</strong> {auctionDetails.tokenId}</p>
                    <p><strong>Creator:</strong> <span title={auctionDetails.originalCreator}>{creatorUsername || `${auctionDetails.originalCreator.substring(0, 6)}...`}</span></p>
                    <p><strong>Starts:</strong> {formatTime(auctionDetails.startTime)}</p>
                    <p><strong>Ends:</strong> {formatTime(auctionDetails.endTime)}</p>
                    <p><strong>Start Price:</strong> {formatEth(auctionDetails.startPrice)} WBT</p>
                    <p><strong>Highest Bid:</strong> {formatEth(auctionDetails.highestBid)} WBT</p>
                    <p><strong>Highest Bidder:</strong> {auctionDetails.highestBidder ? <span title={auctionDetails.highestBidder}>{`${auctionDetails.highestBidder.substring(0, 6)}...${auctionDetails.highestBidder.substring(auctionDetails.highestBidder.length - 4)}`}</span> : 'No bids yet'}</p>
                     {auctionDetails.instantBuyPrice && auctionDetails.instantBuyPrice > 0n && (
                        <p><strong>Instant Buy Price:</strong> {formatEth(auctionDetails.instantBuyPrice)} WBT</p>
                     )}

                    {/* --- Action Section --- */}
                <div className="action-section">
                    <h3>Actions</h3>

                    {/* Error message specifically for actions */}
                    {error && actionLoading && <p className="error-message small">{error}</p>} {/* Show action-specific errors */}
                    {!error && actionLoading && <p className="info-text small">Processing transaction...</p>} {/* Loading indicator */}


                    {/* --- Start Auction Button --- */}
                    {showStartButton && (
                        <button
                            onClick={handleStartAuction}
                            disabled={actionLoading}
                            className="action-button start-button"
                        >
                            {actionLoading ? 'Processing...' : 'Start Auction (Transfer NFT)'}
                        </button>
                    )}
                    {/* Info text if start time not reached */}
                    {isCreator && auctionDetails.auctionState === AuctionState.Open && currentBlockTimestamp < auctionDetails.startTime && !isNftInContract &&(
                        <p className='info-text small'>Auction start time not yet reached.</p>
                    )}
                     {/* Info text if ready to start */}
                     {isCreator && auctionDetails.auctionState === AuctionState.Open && currentBlockTimestamp >= auctionDetails.startTime && !isNftInContract &&(
                        <p className='info-text small'>Auction ready to start. Click button above to transfer NFT.</p>
                    )}
                    {/* Info text if started (NFT transferred) */}
                    {isCreator && auctionDetails.auctionState === AuctionState.Open && isNftInContract && (
                        <p className='info-text small'>Auction is open for bids.</p>
                    )}


                    {/* --- Bidding Section --- */}
                    {auctionDetails.auctionState === AuctionState.Open && isNftInContract && !isCreator && (
                        <div className="bid-section">
                            <input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                // Calculate minimum next bid
                                placeholder={`Min bid: ${formatEth(auctionDetails.highestBid > 0n ? auctionDetails.highestBid + BigInt(1) : auctionDetails.startPrice)} WBT`}
                                min="0"
                                step="any"
                                className="bid-input"
                                disabled={actionLoading}
                            />
                            <button
                                onClick={handlePlaceBid}
                                disabled={actionLoading || !bidAmount}
                                className="action-button bid-button"
                            >
                                {actionLoading ? 'Placing Bid...' : 'Place Bid'}
                            </button>
                        </div>
                    )}
                    {/* Info text if creator tries to bid */}
                    {auctionDetails.auctionState === AuctionState.Open && isNftInContract && isCreator && (
                        <p className="info-text small">You cannot bid on your own auction.</p>
                    )}
                    {/* Info text if auction not formally started */}
                    {auctionDetails.auctionState === AuctionState.Open && !isNftInContract && !isCreator && (
                        <p className="info-text small">Waiting for creator to start the auction before bidding.</p>
                    )}


                    {/* --- Instant Buy Button --- */}
                    {auctionDetails.auctionState === AuctionState.Open && isNftInContract && !isCreator && auctionDetails.instantBuyPrice > 0n && auctionDetails.highestBid < auctionDetails.instantBuyPrice && (
                        <button
                            onClick={handleInstantBuy}
                            disabled={actionLoading}
                            className="action-button instant-buy-button"
                        >
                            {actionLoading ? 'Processing...' : `Instant Buy for ${formatEth(auctionDetails.instantBuyPrice)} WBT`}
                        </button>
                    )}


                    {/* --- Withdraw Funds Button (Creator) --- */}
                    {isCreator && (auctionDetails.auctionState === AuctionState.Ended || auctionDetails.auctionState === AuctionState.InstantBuy) && auctionDetails.highestBid > 0n && (
                        <button
                            onClick={handleWithdrawFunds}
                            disabled={actionLoading}
                            className="action-button withdraw-funds-button"
                        >
                            {actionLoading ? 'Processing...' : 'Withdraw Funds'}
                        </button>
                    )}
                    {/* Info text if no funds to withdraw */}
                    {isCreator && (auctionDetails.auctionState === AuctionState.Ended || auctionDetails.auctionState === AuctionState.InstantBuy) && auctionDetails.highestBid <= 0n && (
                        <p className="info-text small">No funds from bids to withdraw.</p>
                    )}


                    {/* --- Withdraw NFT Button (Winner) --- */}
                    {isHighestBidder && (auctionDetails.auctionState === AuctionState.Ended || auctionDetails.auctionState === AuctionState.InstantBuy) && isNftInContract && (
                        <button
                            onClick={handleWithdrawToken}
                            disabled={actionLoading}
                            className="action-button claim-button" // Changed class for consistency if needed, or keep claim-button
                        >
                            {actionLoading ? 'Processing...' : 'Withdraw Your NFT'}
                        </button>
                    )}
                    {/* Info text if NFT already withdrawn by winner */}
                    {isHighestBidder && (auctionDetails.auctionState === AuctionState.Ended || auctionDetails.auctionState === AuctionState.InstantBuy) && !isNftInContract && (
                        <p className="info-text small">You have already withdrawn the NFT.</p>
                    )}


                    {/* --- Cancel Auction Button (Creator) --- */}
                     {/* Only show Cancel if Open AND NFT is still in creator's wallet OR in contract (cancellable either way before end) */}
                    {isCreator && auctionDetails.auctionState === AuctionState.Open && (
                         <button
                            onClick={handleCancelAuction}
                            disabled={actionLoading}
                            className="action-button cancel-button"
                         >
                            {actionLoading ? 'Processing...' : 'Cancel Auction'}
                        </button>
                    )}

                    {isCreator && ( // Only show this whole section to the creator
                        <div className="factory-update-section">
                            <h4>Update Factory Status:</h4>
                            <p className="info-text small" >Use these buttons after the auction ends or is cancelled to update the main auction list.</p>

                            {/* Button to mark ended in factory */}
                            {(auctionDetails.auctionState === AuctionState.Ended || auctionDetails.auctionState === AuctionState.InstantBuy) && (
                                <button
                                    onClick={handleMarkFactoryEnded}
                                    disabled={actionLoading}
                                    className="action-button factory-button" 
                                    title="Notify the main list that this auction has ended."
                                >
                                    {actionLoading ? 'Processing...' : 'Mark Ended in Factory'}
                                </button>
                            )}

                            {/* Button to mark cancelled in factory */}
                            {auctionDetails.auctionState === AuctionState.Cancelled && (
                                <button
                                    onClick={handleMarkFactoryCancelled}
                                    disabled={actionLoading}
                                    className="action-button factory-button"
                                    title="Notify the main list that this auction was cancelled."
                                >
                                    {actionLoading ? 'Processing...' : 'Mark Cancelled in Factory'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* --- General Informational Messages --- */}
                    {auctionDetails.auctionState === AuctionState.Cancelled && <p className="info-text status-cancelled">This auction was cancelled.</p>}
                    {(auctionDetails.auctionState === AuctionState.Ended || auctionDetails.auctionState === AuctionState.InstantBuy) && !isCreator && !isHighestBidder && <p className="info-text">Auction has ended.</p>}
                    {(auctionDetails.auctionState === AuctionState.Ended || auctionDetails.auctionState === AuctionState.InstantBuy) && isHighestBidder && (
                        <p className="info-text">{isNftInContract ? "Auction ended. You won! Use the Withdraw button." : "Auction ended. You won and have withdrawn the NFT."}</p>
                    )}


                </div> {/* End Action Section */}
                </div> {/* End Right Column */}
            </div> {/* End Details Layout */}
        </div>
    );
}

export default AuctionDetailsPage;