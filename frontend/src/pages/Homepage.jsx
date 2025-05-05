import React, { useContext, useRef, useEffect } from 'react';
import { Web3Context } from '../context/Web3Context.jsx';
import '../styles/Homepage.css';
import nft1 from '../assets/images/nft1.jpg';
import nft2 from '../assets/images/nft2.jpg';
import nft3 from '../assets/images/nft3.jpg';
import nft4 from '../assets/images/nft4.jpg';
import nft5 from '../assets/images/nft5.jpg';
import nft6 from '../assets/images/nft6.jpg';
import nft7 from '../assets/images/nft7.jpg';
import nft8 from '../assets/images/nft8.jpg';
import nft9 from '../assets/images/nft9.png';

function Homepage() {
  const { address, connectWallet } = useContext(Web3Context);
  const galleryRef = useRef(null);

  const images = [
    nft1, nft2, nft4, nft5, nft6,
  ];

  return (
    <div className="main-container">
      <div className="content">
        <h1 className="main-title">Welcome to the Student NFT Marketplace</h1>
        <p className="main-description">Create here, fundraise here</p>

        {/* --- Photo Gallery --- */}
        <div className="photo-gallery-container">
          <div className="photo-gallery-track">
            {images.map((imgSrc, index) => (
              <img
                key={`${imgSrc}-${index}`}
                src={imgSrc}
                alt={`Gallery image ${index + 1}`}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
        {/* --- Photo Gallery End --- */}

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