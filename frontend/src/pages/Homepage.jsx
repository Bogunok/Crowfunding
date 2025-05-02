import React, { useContext } from 'react';
import { Web3Context } from '../context/Web3Context.jsx';
import '../styles/Homepage.css';

function Homepage() {
  const { address, connectWallet } = useContext(Web3Context);

  return (
    <div className="main-container">
      <div className="content">
        <h1 className="main-title">Welcome to the Student NFT Marketplace</h1>
        <p className="main-description">Create here, fundraise here</p>
        {address && (
          <p className="wallet-info">Connected: {address}</p>
        )}
        {!address && (
          <button onClick={connectWallet} className="connect-button">
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export default Homepage;