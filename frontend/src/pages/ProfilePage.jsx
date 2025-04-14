import React from 'react';
import '../styles/ProfilePage.css'; 

function ProfilePage({ user }) {
  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  const maskWalletAddress = (address) => {
    if (!address) {
      return '';
    }
    const firstPart = address.slice(0, 6);
    const lastPart = address.slice(-4);
    return `${firstPart}...${lastPart}`;
  };

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      <div className="profile-info">
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Wallet Address:</strong> {maskWalletAddress(user.wallet_address)}</p>
        {/* You can display other user information here if needed */}
      </div>
    </div>
  );
}

export default ProfilePage;