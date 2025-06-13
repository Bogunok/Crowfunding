# Crowfunding
This project was created for research purposes as part of a Software Engineering program at the National University of Kyiv-Mohyla Academy.

---

## 🧠 About the Project

**Crowfunding** is a Web3-based marketplace designed for student organizations to raise money for their real-world initiatives. Other students who are not members of organizations can support their favourite organizations by buying their NFTs. 

**Student organizations can:**
- Login/logout,
- Connect wallet,
- Mint and list their own NFTs,
- Sell NFTs,
- Put their NFTs up for auctions.

**Supporters can:**
- Login/logout,
- Connect wallet,
- Buy NFTs,
- Make bids on auctions.

  ---

## 🔧 Technologies Used

- **Solidity + Foundry** – for writing, testing, and deploying smart contracts efficiently.
- **Whitechain** – EVM-compatible blockchain used for contract deployment.
- **Ethers.js** – for blockchain interactions and wallet integration (e.g., MetaMask).
- **MetaMask** – browser wallet used for testing and user authentication.
- **Node.js** – backend server logic and API implementation.
- **React + Vite** – modern frontend stack for fast interface development.
- **IPFS (local)** – decentralized storage for NFT metadata.
- **PostgreSQL** – relational database for storing user data (username, password, role, wallet address).

---

## 🧪 Features

- 🎨 NFT minting (ERC-721)
- 🛒 Buy/sell functionality
- 👥 Role separation: organizations vs supporters
- 💬 Optional metadata and descriptions per NFT
- 🔐 MetaMask connection

---

## 🚀 How to Run Locally

1. Clone the repository:
git clone https://github.com/Bogunok/Crowfunding.git

2. Install dependencies
npm install

3. Install IPFS locally
https://docs.ipfs.tech/install/ipfs-desktop/

4. Run your IPFS by starting a desktop app

5. Run the server
- Go to backend dir: cd backend
- Run command: node server.js

6. Run frontend
- Go to frontend dir: cd frontend
- Run command: npm run dev

