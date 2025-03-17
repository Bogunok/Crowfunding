'use client';

import '../styles/navbar.css';

export default function navbar({ walletAddress, connectWallet }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo">🎓 SOfund</div>
        <a href="/explore" className="nav-link">Explore NFTs</a>
        <a href="/organizations" className="nav-link">Organizations</a>
      </div>
      <div className="navbar-right">
        <button onClick={connectWallet} className="connect-button">
          {walletAddress ? walletAddress.slice(0, 6) + '...' : "Connect Wallet"}
        </button>
      </div>
    </nav>
  );
}
