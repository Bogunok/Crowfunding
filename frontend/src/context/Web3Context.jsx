import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Create the context
export const Web3Context = createContext({
  provider: null,
  signer: null,
  address: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isWalletConnected: false,
});

// Create the context provider component
export const Web3ContextProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      try {
        // Request account access if needed
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Create a new provider using the browser's Ethereum provider
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);

        // Get the signer
        const newSigner = await newProvider.getSigner();
        setSigner(newSigner);

        // Get the user's address
        const newAddress = await newSigner.getAddress();
        setAddress(newAddress);
        setIsWalletConnected(true);
        console.log('Wallet connected:', newAddress);
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      console.log('Please install MetaMask!');
      // Optionally, you can redirect the user to install MetaMask
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsWalletConnected(false);
    console.log('Wallet disconnected');
  }, []);

  // Check if the wallet is already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet(); // Re-establish connection if accounts exist
          }
        } catch (error) {
          console.error('Error checking existing accounts:', error);
        }
      }
    };

    //checkConnection();

    // Set up event listeners for account changes and network changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on('chainChanged', (_chainId) => {
        // Handle chain ID change if needed (e.g., reload the page)
        window.location.reload();
      });
    }

    return () => {
      // Clean up event listeners if needed
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [connectWallet, disconnectWallet]);

  return (
    <Web3Context.Provider value={{ provider, signer, address, connectWallet, disconnectWallet, isWalletConnected }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWallet = () => {
    return useContext(Web3Context);
  };