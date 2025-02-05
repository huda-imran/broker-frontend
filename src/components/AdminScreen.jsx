import React, { useState, useEffect } from "react";
import "../styles/AdminScreen.css";
import * as kondor from "kondor-js";
import { Contract } from "koilib";
import lendingAbi from "../utils/lendingAbi.json"; // Import your contract ABI
import borrowAbi from "../utils/borrowAbi.json";
import { useWallet } from "../context/WalletContext";

const AdminScreen = () => {
  const [isLendingAllowed, setIsLendingAllowed] = useState(false); // Toggle for lenders
  const [lendingRate, setLendingRate] = useState(null); // Default lending rate
  const [borrowingRate, setBorrowingRate] = useState(null); // Default borrowing rate
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [tokens, setTokens] = useState([]); // Tokens fetched from backend
  const { account } = useWallet();
  // Fetch tokens from backend
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/token`);
        if (!response.ok) {
          throw new Error("Failed to fetch token data.");
        }
        const tokenData = await response.json();
        setTokens(tokenData);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        alert("Failed to load token data.");
      }
    };

    fetchTokens();
  }, []);

  // Fetch blockchain-related data (paused state, lending rate, borrow rate)
  useEffect(() => {
  const fetchBlockchainData = async () => {
    try {
      const lendingContractAddress = process.env.REACT_APP_LENDING_CONTRACT;
      const borrowContractAddress = process.env.REACT_APP_BORROW_CONTRACT;

      // Create contract instances
      const lendingContract = new Contract({
        id: lendingContractAddress,
        abi: lendingAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
      });

      const borrowContract = new Contract({
        id: borrowContractAddress,
        abi: borrowAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
      });

      // Fetch paused state
      const { result: pausedState } = await lendingContract.functions.getPaused();
      setIsLendingAllowed(!(pausedState?.value)); // Flip because `true` means paused

      // Fetch current lending rate
      const { result: lendingRateResult } = await lendingContract.functions.getLendingRate();
      if (lendingRateResult?.value !== undefined) {
        setLendingRate(parseInt(lendingRateResult.value));
      }

      // Fetch current borrowing rate
      const { result: borrowRateResult } = await borrowContract.functions.getBorrowRate();
      if (borrowRateResult?.value !== undefined) {
        setBorrowingRate(parseInt(borrowRateResult.value));
      }

    } catch (error) {
      console.error("Error fetching blockchain data:", error);
      alert("Failed to fetch blockchain data.");
    }
  };

  fetchBlockchainData();
}, []);


  const toggleLending = async () => {
    try {
      console.log(isLendingAllowed);
      if (isLendingAllowed === null) return; // Prevent toggling if state is unknown
      const newPausedState = !isLendingAllowed; // Flip the current state
      setIsLendingAllowed(newPausedState); // Optimistically update UI
      const adminAddress = account;
      // Lending contract address from .env
      const lendingContractAddress = process.env.REACT_APP_LENDING_CONTRACT;
      // Contract instance
      const lendingContract = new Contract({
        id: lendingContractAddress,
        abi: lendingAbi, // Ensure ABI is correctly imported
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(adminAddress),
      });

  
      // Call `setPaused` with the new value
      const { transaction, receipt } = await lendingContract.functions.setPaused({
        value: !newPausedState, // Flip because `true` means paused
      });
      console.log("receipt",receipt);
      console.log("transaction", transaction);
  
      if (!receipt) {
        throw new Error("Transaction failed");
      }
  
      alert(`Lending ${newPausedState ? "resumed" : "paused"} successfully! TXID: ${transaction.id}`);
    } catch (error) {
      console.error("Error updating lending state:", error);
      alert("Failed to update lending state. Check the console for details.");
      setIsLendingAllowed(!isLendingAllowed); // Revert UI on failure
    }
  };

  const updateLendingRate = async () => {
    try {
      const lendingContractAddress = process.env.REACT_APP_LENDING_CONTRACT;
      const lendingContract = new Contract({
        id: lendingContractAddress,
        abi: lendingAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(account),
      });
      const { transaction, receipt } = await lendingContract.functions.setLendingRate({
        value: String(lendingRate),
      });
      if (!receipt) throw new Error("Transaction failed");
      alert(`Lending Rate Updated! TXID: ${transaction.id}`);
    } catch (error) {
      console.error("Error updating lending rate:", error);
      alert("Failed to update lending rate.");
    }
  };
  const updateBorrowingRate = async () => {
    try {
      const accounts = await kondor.getAccounts();
      if (!accounts || accounts.length === 0) {
        alert("No accounts found. Please connect your wallet.");
        return;
      }
  
      const borrowContractAddress = process.env.REACT_APP_BORROW_CONTRACT;
      const borrowContract = new Contract({
        id: borrowContractAddress,
        abi: borrowAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(accounts[0].address),
      });
  
      const { transaction, receipt } = await borrowContract.functions.setBorrowRate({
        value: String(borrowingRate),
      });
  
      if (!receipt) throw new Error("Transaction failed");
  
      alert(`Borrowing Rate Updated! TXID: ${transaction.id}`);
    } catch (error) {
      console.error("Error updating borrowing rate:", error);
      alert("Failed to update borrowing rate.");
    }
  };


  // Add New Token by Sending API Request
  const addNewToken = async () => {
    if (!newTokenAddress) {
      alert("Please enter a valid token contract address.");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: newTokenAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add token.");
      }

      const result = await response.json();
      setTokens([...tokens, result.token]); // Update state with new token
      setNewTokenAddress(""); // Clear input
      alert("Token added successfully!");
    } catch (error) {
      console.error("Error adding token:", error);
      alert(error.message);
    }
  };



  return (
    <div className="admin-container">
      <h1 className="section-title">Admin Panel</h1>

      {/* Toggle Lending */}
      <div className="admin-section">
        <label>
          <span>Allow New Lenders:</span>
          <input
            type="checkbox"
            checked={isLendingAllowed}
            onChange={toggleLending}
          />
        </label>
      </div>

      {/* Lending Rate Adjustment */}
      <div className="admin-section">
        <label>
          <span>Lending Rate (ROI %):</span>
          <input
            type="number"
            value={lendingRate}
            onChange={(e) => setLendingRate(e.target.value)}
          />
          <button onClick={updateLendingRate}>Update</button> {/* Update Button */}
        </label>
      </div>
          {/* Borrow Rate Section */}

          <div className="admin-section">
        <label>
          <span>Global Borrowing Rate (%):</span>
          <input
            type="number"
            value={borrowingRate}
            onChange={(e) => setBorrowingRate(e.target.value)}
          />
          <button onClick={updateBorrowingRate}>Update</button> {/* Update Button */}
        </label>
      </div>

      {/* Add New Token */}
      <div className="admin-section">
        <label>
          <span>New Collateral Token:</span>
          <input
            type="text"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            placeholder="Enter contract address"
          />
        </label>
        <button onClick={addNewToken}>Add Token</button>
      </div>



{/* Existing Tokens Display */}
<div className="admin-section">
  <h2>Added Tokens</h2>
  {tokens.length === 0 ? (
    <p>No tokens available.</p>
  ) : (
    <table className="token-table">
      <thead>
        <tr>
          <th>Token Name</th>
          <th>Symbol</th>
          <th>Contract Address</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((token, index) => (
          <tr key={index}>
            <td>{token.name}</td>
            <td>{token.symbol}</td>
            <td>{token.address.slice(0, 6)}...{token.address.slice(-4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>

    </div>
  );
};

export default AdminScreen;
