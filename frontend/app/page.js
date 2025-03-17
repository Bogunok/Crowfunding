'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import Navbar from '../components/navbar';
import '../styles/homepage.css';

export default function homepage() {
  const [walletAddress, setWalletAddress] = useState('');

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <div className="main-container">
      <Navbar walletAddress={walletAddress} connectWallet={connectWallet} />
      <div className="content">
        <h1 className="main-title">Welcome to the Student NFT Marketplace</h1>
        {walletAddress && (
          <p className="wallet-info">Connected: {walletAddress}</p>
        )}
      </div>
    </div>
  );
}
