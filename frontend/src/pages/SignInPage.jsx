import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Web3Context } from '../context/Web3Context.jsx'; 
import '../styles/SignInPage.css';

function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Access the address from Web3Context
  const { address } = useContext(Web3Context);

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleRoleChange = (event) => {
    setRole(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!address) {
      setError('Please connect your wallet before signing up.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, walletAddress: address, role }), // Use the address from context
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Registration successful:', data);
        navigate('/'); // Redirect to the homepage after successful registration
      } else {
        console.error('Registration failed:', data);
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setError('Failed to connect to the server');
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign In</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={handleUsernameChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
        </div>
        <div>
          <label htmlFor="role">Role:</label>
          <select id="role" value={role} onChange={handleRoleChange}>
            <option value="student">Student</option>
            <option value="student organization">Student Organization</option>
          </select>
        </div>
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}

export default SignInPage;