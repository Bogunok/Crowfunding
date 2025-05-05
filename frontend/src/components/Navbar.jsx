import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/Web3Context.jsx';
import '../styles/Navbar.css';
import crowIcon from '../assets/images/crow-icon.png'; 

export default function Navbar({ isLoggedIn, userRole }) {
  const { address, connectWallet } = useWallet();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="logo-link">
        <div className="logo">
            <img src={crowIcon} alt="Crow logo" className="logo-icon" />
            
            Crowfunding
          </div>
        </Link>
      </div>
      
      <div className="navbar-center">
        {isLoggedIn && userRole!== 'student' && (
        <Link to="/mint" className="nav-link">Mint NFT</Link>
        )}
        <Link to="/all-nfts" className="nav-link">Explore NFTs</Link>
        <Link to="/listings" className="nav-link">Listings</Link>
        <Link to="/auctions" className="nav-link">Auctions</Link>
      </div>

      <div className="navbar-right">
      {!isLoggedIn && (
          <> 
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/signin" className="nav-link">Sign up</Link>
          </>
        )}
        <button onClick={connectWallet} className="connect-button">
          {address ? address.slice(0, 6) + '...' : "Connect Wallet"}
        </button>
        {isLoggedIn && (
          <Link to="/profile" className="profile-button">
            Profile
          </Link>
          
        )}
      </div>
    </nav>
  );
}
