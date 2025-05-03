import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import StudentNFTABI from '../contracts/StudentNFT.json';
import { Web3Context } from '../context/Web3Context';
import '../styles/MintPage.css';
import { STUDENTNFT_ADDRESS} from '../constants';


function MintPage() {
  const [imageFile, setImageFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mintingStatus, setMintingStatus] = useState('');
  const [contract, setContract] = useState(null);
  const { signer, isWalletConnected, address } = useContext(Web3Context);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function fetchUserRole() {
      if (address) {
        setUserRole(null); 
        try {
          
          const response = await fetch(`http://localhost:5000/api/auth/users/${address}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role); 
            console.log("User role fetched:", userData.role);
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
  }, [address]);


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
        } catch (error) {
          console.error('Error initializing contract:', error);
          setMintingStatus('Error initializing contract.');
        }
      } else {
        setContract(null);
      }
    }

    initializeContract();
  }, [isWalletConnected, signer]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  const uploadToIPFS = async () => {
    if (!imageFile || !name || !description) {
      setMintingStatus('Please select an image and provide a name and description.');
      return null;
    }
    setMintingStatus('Uploading to IPFS...');
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('name', name);
      formData.append('description', description);
      const response = await fetch('http://localhost:5000/api/upload-nft', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error uploading to backend:', errorData);
        setMintingStatus(`IPFS upload failed: ${errorData}`);
        return null;
      }
      const data = await response.json();
      setMintingStatus('Metadata uploaded to IPFS successfully!');
      return data.metadataUri;
    } catch (error) {
      console.error('Error uploading to backend:', error);
      setMintingStatus('Error communicating with the server.');
      return null;
    }
  };

  async function handleMintNFT() {
    if (!contract) {
      setMintingStatus('Connect your wallet first.');
      return;
    }
    if (!address) {
      setMintingStatus('Wallet address not found. Please ensure your wallet is connected.');
      return;
    }

    if (userRole !== 'student organization') {
      setMintingStatus(`Minting restricted`);
      console.warn(`Mint attempt blocked for user ${address} with role ${userRole}`);
      return;
    }

    setMintingStatus('Preparing to mint...');
    const metadataURI = await uploadToIPFS();

    if (metadataURI) {
      setMintingStatus('Minting in progress...');
      try {
        console.log(`Minting NFT for ${address} with metadata URI: ${metadataURI}`);
        const tx = await contract.mintNFT(metadataURI);
        console.log('Transaction hash:', tx.hash);
        setMintingStatus('Waiting for transaction confirmation...');
        await tx.wait();
        setMintingStatus('NFT minted successfully!');
        setImageFile(null);
        const fileInput = document.getElementById('image');
        if (fileInput) fileInput.value = null;
        setName('');
        setDescription('');
      } catch (error) {
        console.error('Error minting NFT:', error);
        if (error.code === 'ACTION_REJECTED') {
             setMintingStatus('Transaction rejected in wallet.');
        } else if (error.reason) {
             setMintingStatus(`Minting failed: ${error.reason}`);
        } else {
            setMintingStatus(`Minting failed: ${error.message}`);
        }
      }
    }
  }

  
  const isMintingDisabled =
        !contract ||
        !address ||
        userRole !== 'student organization' || 
        mintingStatus.includes('...') ||
        mintingStatus.includes('Waiting') ||
        mintingStatus.includes('Uploading') ||
        mintingStatus.includes('Preparing');

  const areInputsDisabled = !isWalletConnected || userRole !== 'student organization';

  return (
    <div className="container">
      <h1 className="page-title">Mint Your Own NFT</h1>
      {!isWalletConnected ? (
        <p className="connect-wallet-message">Please connect your wallet to mint NFTs.</p>
      ) : (
        <div className="mint-form">
          {isWalletConnected && userRole !== 'student organization' && userRole !== null && (
            <p className="error-message">
              Only student organizations can mint NFT.
            </p>
          )}


          <div className="form-group">
            <label htmlFor="image" className="form-label">Upload Image:</label>
            <input
              type="file"
              id="image"
              onChange={handleImageChange}
              className="form-input"
              accept="image/*"
              disabled={areInputsDisabled}
            />
          </div>
          <div className="form-group">
            <label htmlFor="name" className="form-label">NFT Name:</label>
            <input
              type="text"
              id="name"
              value={name || ''}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              disabled={areInputsDisabled}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description" className="form-label">Description:</label>
            <textarea
              id="description"
              value={description || ''}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              disabled={areInputsDisabled}
            />
          </div>
          <button
            onClick={handleMintNFT}
            className="mint-button"
            disabled={isMintingDisabled}
          >
            { mintingStatus.includes('...') ||
              mintingStatus.includes('Waiting') ||
              mintingStatus.includes('Uploading') ||
              mintingStatus.includes('Preparing')
               ? 'Processing...' : 'Mint NFT'}
          </button>
          {mintingStatus && <p className={`mint-status ${mintingStatus.includes('failed') || mintingStatus.includes('Error') || mintingStatus.includes('restricted') ? 'error-message' : 'info-message'}`}>{mintingStatus}</p>}
        </div>
      )}
    </div>
  );
}

export default MintPage;