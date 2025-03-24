import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import "../styles/Header.css";
import { useWallet } from "../context/WalletContext"; // Import the Wallet context

export const Header = () => {
  const { account, setAccount, network, setNetwork } = useWallet(); // Get wallet state from context
  const [showDropdown, setShowDropdown] = useState(false); // Dropdown state
  const dropdownRef = useRef(null); // Ref for dropdown menu
  const adminWalletAddress = process.env.REACT_APP_ADMIN_WALLET; // Admin wallet from .env
  const navigate = useNavigate(); // ✅ Use navigate to handle routing

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to connect.");
      return;
    }
  
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("wallet_requestPermissions", [
        { eth_accounts: {} },
      ]); // ✅ Reset permissions to force account selection
  
      const newAccounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork(); // ✅ Get the current network
      
  
      // ✅ Allow only Ethereum Mainnet & Sepolia
      if (network.chainId !== 1 && network.chainId !== 11155111) {
        alert("Please switch to Ethereum Mainnet or Sepolia to connect.");
        return;
      }
  
      if (newAccounts.length > 0) {
        setAccount(newAccounts[0]); // Save wallet address in state
        setNetwork(network.name);
        console.log(network.name);
        localStorage.setItem("connectedAccount", newAccounts[0]); // Save to localStorage
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };
  

  // ✅ Handle Logout - Remove Wallet & Force Reconnect
  const handleLogout = () => {
    setAccount(null); // Clear the account from state
    localStorage.removeItem("connectedAccount"); // Remove from localStorage
    setShowDropdown(false); // Close dropdown
  };

  // ✅ Check for existing wallet connection on page load
  useEffect(() => {
    const savedAccount = localStorage.getItem("connectedAccount");
    if (savedAccount) {
      setAccount(savedAccount); // Restore wallet address from localStorage
    }
  }, [setAccount]);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="header">
      {/* Logo */}
      <div className="logo" onClick={() => navigate("/")}>
        <h2>DealGuard</h2>
      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        {account?.toLowerCase() === adminWalletAddress?.toLowerCase() && (
          <span className="nav-link" onClick={() => navigate("/admin")}>
            Admin Dashboard
          </span>
        )}
      </nav>

      {/* Wallet Dropdown */}
      <div className="wallet-container" ref={dropdownRef}>
        {account ? (
          <>
            <button
              className="wallet-btn"
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              {account.slice(0, 6)}...{account.slice(-4)}
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item">
                  <strong>Connected Wallet:</strong>
                  <span>{account}</span>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          <button className="wallet-btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
};
