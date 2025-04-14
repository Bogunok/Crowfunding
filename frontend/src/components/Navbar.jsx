import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/Web3Context.jsx';
import '../styles/Navbar.css';

export default function Navbar({ isLoggedIn }) {
  const { address, connectWallet } = useWallet();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="logo-link">
          <div className="logo">Crowfunding</div>
        </Link>
      </div>
      <div className="navbar-center">
        <Link to="/mint" className="nav-link">Mint NFT</Link>
        <Link to="/all-nfts" className="nav-link">Explore NFTs</Link>
      </div>
      <div className="navbar-right">
      <Link to="/login" className="nav-link">Login</Link>
      <Link to="/signin" className="nav-link">Sign in</Link>
        <button onClick={connectWallet} className="connect-button">
          {address ? address.slice(0, 6) + '...' : "Connect Wallet"}
        </button>
        {isLoggedIn && (
          <Link to="/profile" className="profile-button">
            {/* You can add an icon or initials here if you want */}
            P
          </Link>
        )}
      </div>
    </nav>
  );
}
