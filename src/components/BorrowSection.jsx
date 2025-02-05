import React, { useState, useEffect } from "react";
import "../styles/BorrowSection.css";
import * as kondor from "kondor-js";
import { Contract, utils } from "koilib";
import { useWallet } from "../context/WalletContext";

export const BorrowSection = () => {
  const [borrowAmount, setBorrowAmount] = useState(0);
  const [selectedToken, setSelectedToken] = useState(""); // Symbol of the selected token
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokens, setTokens] = useState([]); // Tokens fetched from backend
  const { account } = useWallet();
  
  // Fetch Borrow Contract from environment
  //const borrowContractAddress = process.env.REACT_APP_BORROW_CONTRACT;

  // Fetch tokens from backend
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
        alert("Failed to load token data. Please check the console for details.");
      }
    };

    fetchTokens();
  }, []);

  const handleBorrow = async () => {
    if (!borrowAmount || borrowAmount <= 0) {
        alert("Please enter a valid borrow amount.");
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

        const { collateralAmount, tokenAddress } = await collateralResponse.json();
        console.log(`Collateral Required: ${collateralAmount} ${selectedToken}`);

        // Token contract instance
        const tokenContract = new Contract({
            id: tokenAddress,
            abi: utils.tokenAbi,
            provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
            signer: kondor.getSigner(borrowerAddress),
        });

        // Check allowance for Borrow contract
        const { result: allowance } = await tokenContract.functions.allowance({
            owner: borrowerAddress,
            spender: process.env.REACT_APP_BORROW_CONTRACT,
        });

        if ((allowance?.value ?? 0) < collateralAmount) {
            // Request approval if allowance is insufficient
            const approvalTx = await tokenContract.functions.approve({
                owner: borrowerAddress,
                spender: process.env.REACT_APP_BORROW_CONTRACT,
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

      {/* Borrow Button */}
      <button
        className="borrow-btn"
        onClick={handleBorrow}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Transaction"}
      </button>

      {/* Info Box */}
      <div className="info-box">
        <p>Max borrow is 50% of token market value.</p>
        <p>Fees: 10% up front.</p>
        <p>Funds must be returned within 30 days to unlock tokens.</p>
      </div>
    </div>
  );
};
