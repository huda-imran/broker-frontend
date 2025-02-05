import React, { useState, useEffect, useRef } from "react";
import "../styles/Header.css";
import * as kondor from "kondor-js";
import { useWallet } from "../context/WalletContext"; // Import the Wallet context

export const Header = ({ setActiveSection }) => {
  const { account, setAccount } = useWallet(); // Get wallet state from context
  const [showDropdown, setShowDropdown] = useState(false); // Dropdown state
  const dropdownRef = useRef(null); // Ref for dropdown menu
  const adminWalletAddress = process.env.REACT_APP_ADMIN_WALLET; // Admin wallet from .env


  // Handle wallet connection
  const connectWallet = async () => {
    try {
      const accounts = await kondor.getAccounts();
      if (accounts.length === 0) {
        alert("No accounts found in Kondor. Please create or import an account.");
        return;
      }
      const walletAddress = accounts[0].address;
      setAccount(walletAddress); // Store wallet address in global state
      localStorage.setItem("connectedAccount", walletAddress); // Save to localStorage
      console.log("Connected Account:", walletAddress);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // Handle logout
  const handleLogout = () => {
    setAccount(null); // Clear the account from state
    localStorage.removeItem("connectedAccount"); // Remove wallet address from localStorage
    setShowDropdown(false); // Close the dropdown
  };

  // Check for wallet connection on page load
  useEffect(() => {
    const savedAccount = localStorage.getItem("connectedAccount");
    if (savedAccount) {
      setAccount(savedAccount); // Restore wallet address from localStorage
    }
  }, [setAccount]);

  // Close dropdown when clicking outside
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
      <div className="logo">
        <h2>Koinos</h2>
      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        <span className="nav-link" onClick={() => setActiveSection("borrow")}>Borrow</span>
        <span className="nav-link" onClick={() => setActiveSection("lend")}>Lend</span>
        <span className="nav-link" onClick={() => setActiveSection("dashboard")}>Dashboard</span>
        <span
  className="nav-link"
  onClick={() => setActiveSection("admin")}
  style={{ display: account === adminWalletAddress ? "inline" : "none" }}
>
  Admin Dashboard
</span>

      </nav>

      {/* Wallet Dropdown */}
      <div className="wallet-container" ref={dropdownRef}>
        {account ? (
          <>
            <button
              className="wallet-btn"
              onClick={() => setShowDropdown((prev) => !prev)} // Toggle dropdown
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
