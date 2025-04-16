import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './components/Navbar';
import './App.css';
import Homepage from './pages/Homepage';
import MintPage from './pages/MintPage';
import AllNftsPage from './pages/AllNftsPage';
import LoginPage from './pages/LoginPage';
import SignInPage from './pages/SignInPage';
import ProfilePage from './pages/ProfilePage';
import NFTDetailsPage from './pages/NFTDetailsPage';
import ListingsPage from './pages/ListingsPage';

//const projectId = 'b49849bbf71ecec8def59477cf94bc81'; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Initially, the user is not logged in
  const [loggedInUser, setLoggedInUser] = useState(null); // To store user details

  // This function will be called when the login is successful in LoginPage
  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    setLoggedInUser(userData); // Store the user data received from the backend
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser(null);
    // You might also want to clear any stored tokens or local storage here
  };
  return (
    <Router>
        <Navbar isLoggedIn={isLoggedIn} userRole={loggedInUser?.role} onLogout={handleLogout}/>
        <div className="App-content">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/mint" element={<MintPage />} />
            <Route path="/all-nfts" element={<AllNftsPage />} />
            <Route path="/listings" element={<ListingsPage />} /> {/* Route for listings */}
            <Route path="/nfts/:tokenId" element={<NFTDetailsPage />} /> {/* Route for individual NFT details */}
            <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess}/>} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/profile" element={<ProfilePage user={loggedInUser} onLogout={handleLogout} />} />
            {/* Add other routes for your pages here */}
          </Routes>
        </div>
    </Router>
  );
}

export default App;