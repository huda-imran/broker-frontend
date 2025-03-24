import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";
import { useWallet } from "../context/WalletContext";

export const Header = () => {
  const { account, setAccount, network, setNetwork } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const adminWalletAddress = process.env.REACT_APP_ADMIN_WALLET;
  const navigate = useNavigate();

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to connect.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("wallet_requestPermissions", [{ eth_accounts: {} }]);
      const newAccounts = await provider.send("eth_requestAccounts", []);
      const currentNetwork = await provider.getNetwork();

      if (currentNetwork.chainId !== 1 && currentNetwork.chainId !== 11155111) {
        alert("Please switch to Ethereum Mainnet or Sepolia to connect.");
        return;
      }

      if (newAccounts.length > 0) {
        setAccount(newAccounts[0]);
        setNetwork(currentNetwork.name);
        localStorage.setItem("connectedAccount", newAccounts[0]);
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const handleLogout = () => {
    setAccount(null);
    setNetwork(null);
    localStorage.removeItem("connectedAccount");
    setShowDropdown(false);
  };

  // ✅ Restore wallet on page load
  useEffect(() => {
    const restoreWallet = async () => {
      const savedAccount = localStorage.getItem("connectedAccount");
      if (savedAccount && window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const currentNetwork = await provider.getNetwork();

        if (currentNetwork.chainId === 1 || currentNetwork.chainId === 11155111) {
          setAccount(savedAccount);
          setNetwork(currentNetwork.name);
        }
      }
    };

    restoreWallet();
  }, [setAccount, setNetwork]);

  // ✅ Detect network change via Metamask and update state
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = async () => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const newNetwork = await provider.getNetwork();
        setNetwork(newNetwork.name);
      };

      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [setNetwork]);

  // ✅ Close dropdown on outside click
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
      <div className="logo" onClick={() => navigate("/")}>
        <h2>DealGuard</h2>
      </div>

      <nav className="nav-menu">
        {account?.toLowerCase() === adminWalletAddress?.toLowerCase() && (
          <span className="nav-link" onClick={() => navigate("/admin")}>
            Admin Dashboard
          </span>
        )}
      </nav>

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
                  <br />
                  <strong>Network:</strong>
                  <span>{network}</span>
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
