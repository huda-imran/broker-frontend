import React, { useState, useEffect } from "react";
import "../styles/BorrowSection.css";
import * as kondor from "kondor-js";
import { Contract, utils } from "koilib";
import { useWallet } from "../context/WalletContext";
import borrowAbi from "../utils/borrowAbi.json"; // Borrow Contract ABI

export const BorrowSection = () => {
  const [borrowAmount, setBorrowAmount] = useState(0);
  const [selectedToken, setSelectedToken] = useState(""); // Symbol of selected token
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokens, setTokens] = useState([]); // Tokens from backend
  const [borrowRate, setBorrowRate] = useState(null); // Fee fetched from contract
  const { account } = useWallet();

  const BORROW_CONTRACT_ADDRESS = process.env.REACT_APP_BORROW_CONTRACT; // Borrow Contract Address
  const PROVIDER_URL = process.env.REACT_APP_PROVIDER; // Blockchain Provider URL

  // Fetch Tokens from Backend
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/token`);
        if (!response.ok) {
          throw new Error("Failed to fetch token data from the backend.");
        }
        const tokenData = await response.json();
        setTokens(tokenData);

        // Set default selected token
        if (tokenData.length > 0) {
          setSelectedToken(tokenData[0].symbol);
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
        alert("Failed to load token data.");
      }
    };

    fetchTokens();
  }, []);

  // Fetch Borrow Rate from Contract
  useEffect(() => {
    const fetchBorrowRate = async () => {
      try {
        console.log("Fetching borrow rate...");

        const borrowContract = new Contract({
          id: BORROW_CONTRACT_ADDRESS,
          abi: borrowAbi,
          provider: kondor.getProvider(PROVIDER_URL),
        });

        // Call getBorrowRate function from the contract
        const { result } = await borrowContract.functions.getBorrowRate();

        if (result?.value !== undefined) {
          setBorrowRate(parseInt(result.value)); // Convert to integer
          console.log("Borrow Rate (Fee %):", result.value);
        } else {
          setBorrowRate(0); // Convert to integer
          console.log("Borrow Rate (Fee %):", 0);
        }
      } catch (error) {
        console.error("Error fetching borrow rate:", error);
      }
    };

    fetchBorrowRate();
  }, [BORROW_CONTRACT_ADDRESS, PROVIDER_URL]);

  // Handle Borrow Request
  const handleBorrow = async () => {
    if (!borrowAmount || borrowAmount <= 0) {
      alert("Please enter a valid borrow amount.");
      return;
    }

    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }

    const selectedTokenData = tokens.find((token) => token.symbol === selectedToken);
    if (!selectedTokenData) {
      alert("Invalid token selected.");
      return;
    }

    try {
      setIsSubmitting(true);

      const borrowerAddress = account;

      // Call backend to get collateral amount & fee
      const collateralResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/borrow/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: borrowAmount,
          tokenSymbol: selectedToken,
          borrowerAddress,
        }),
      });

      if (!collateralResponse.ok) {
        throw new Error("Failed to fetch collateral data.");
      }

      let { collateralAmount, tokenAddress } = await collateralResponse.json();
      //console.log(`Collateral Required: ${collateralAmount} ${selectedToken}`);
      collateralAmount = collateralAmount*100000000;
      console.log(`Collateral Required: ${collateralAmount} ${selectedToken}`);
      

      // Token contract instance
      const tokenContract = new Contract({
        id: tokenAddress,
        abi: utils.tokenAbi,
        provider: kondor.getProvider(PROVIDER_URL),
        signer: kondor.getSigner(borrowerAddress),
      });

      // Check allowance for Borrow contract
      const { result: allowance } = await tokenContract.functions.allowance({
        owner: borrowerAddress,
        spender: BORROW_CONTRACT_ADDRESS,
      });

      if ((allowance?.value ?? 0) < collateralAmount) {
        // Request approval if allowance is insufficient
        const approvalTx = await tokenContract.functions.approve({
          owner: borrowerAddress,
          spender: BORROW_CONTRACT_ADDRESS,
          value: String(collateralAmount),
        });

        if (!approvalTx.receipt) {
          alert("Approval transaction failed.");
          return;
        }

        // Wait for the approval transaction to be processed
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Send borrow transaction request to backend
      const borrowResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/borrow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collateralAmount,
          amount: borrowAmount,
          tokenSymbol: selectedToken,
          borrowerAddress,
        }),
      });

      if (!borrowResponse.ok) {
        throw new Error("Borrow transaction failed.");
      }

      const data = await borrowResponse.json();
      alert(`Transaction successful! TXID: ${data.transactionId} \nCollateral Required: ${collateralAmount} ${selectedToken}`);

    } catch (error) {
      console.error("Error during borrow transaction:", error);
      alert("An error occurred. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="borrow-container">
      <h1 className="section-title">Borrow KOIN</h1>

      {/* Token Selection */}
      <div className="input-group">
        <label>Select Token:</label>
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
        >
          {tokens.map((token) => (
            <option key={token.address} value={token.symbol}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>
      </div>

      {/* Borrow Amount */}
      <div className="input-group">
        <label>Borrow Amount (KOIN):</label>
        <input
          type="number"
          value={borrowAmount}
          onChange={(e) => setBorrowAmount(Number(e.target.value))}
          placeholder="Enter amount to borrow"
        />
      </div>

      {/* Info Box */}
      <div className="summary-box">
        <p>Max borrow is 50% of token market value.</p>
        <p>Fees: <strong>{borrowRate !== null ? `${borrowRate}%` : "Fetching..."}</strong> up front.</p>
        <p>Funds must be returned within 30 days to unlock tokens.</p>
      </div>

      {/* Borrow Button */}
      <button className="borrow-btn" onClick={handleBorrow} disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Transaction"}
      </button>
    </div>
  );
};
