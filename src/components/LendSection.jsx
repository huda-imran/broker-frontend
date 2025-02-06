import React, { useState, useEffect } from "react";
import "../styles/LendSection.css";
import * as kondor from "kondor-js";
import { Contract } from "koilib";
import abi from "../utils/lendingAbi.json"; // Lending Contract ABI
import { useWallet } from "../context/WalletContext";

export const LendSection = () => {
  const [amountToLend, setAmountToLend] = useState(1000); // Default lend amount
  const [roi, setROI] = useState(null); // ROI fetched from contract
  const [earlyWithdrawFee] = useState(50); // 50% fee
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account } = useWallet();

  const LENDING_CONTRACT_ADDRESS = process.env.REACT_APP_LENDING_CONTRACT; // Lending Contract Address
  const PROVIDER_URL = process.env.REACT_APP_PROVIDER; // Blockchain Provider URL

  // Fetch Lending Rate from Contract
  useEffect(() => {
    const fetchLendingRate = async () => {
      try {
        console.log("Fetching lending rate...");
        
        const lendingContract = new Contract({
          id: LENDING_CONTRACT_ADDRESS,
          abi,
          provider: kondor.getProvider(PROVIDER_URL),
        });

        // Call getLendingRate from the smart contract
        const { result } = await lendingContract.functions.getLendingRate();

        if (result?.value !== undefined) {
          setROI(parseInt(result.value)); // Convert to integer
          console.log("Lending Rate:", result.value);
        } else {
          setROI(0);
          console.log("Lending rate is 0")
        }
      } catch (error) {
        console.error("Error fetching lending rate:", error);
      }
    };

    fetchLendingRate();
  }, []);

  // Handle Lending Submission
  const handleSubmit = async () => {
    if (amountToLend <= 0) {
      alert("Please enter a valid amount to lend.");
      return;
    }

    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Submitting lend transaction...");

      // Lending Contract Instance
      const lendingContract = new Contract({
        id: LENDING_CONTRACT_ADDRESS,
        abi,
        provider: kondor.getProvider(PROVIDER_URL),
        signer: kondor.getSigner(account),
      });

      // Transaction Arguments
      const args = {
        lender: account,
        amount: String(amountToLend),
      };

      console.log("Lending Transaction Args:", args);

      const { transaction, receipt } = await lendingContract.functions.deposit(args);

      if (receipt) {
        alert(`Successfully lent ${amountToLend} KOIN. TXID: ${transaction.id}`);
        console.log("Transaction successful:", transaction);
      } else {
        throw new Error("Transaction failed.");
      }
    } catch (error) {
      console.error("Error during lending:", error);
      alert("An error occurred. Check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lend-container">
      <h1 className="section-title">Lend KOIN</h1>

      {/* Amount to Lend */}
      <div className="input-group">
        <label>Amount to Lend (KOIN):</label>
        <input
          type="number"
          placeholder="Enter amount to lend"
          value={amountToLend}
          onChange={(e) => setAmountToLend(Number(e.target.value))}
        />
      </div>

      {/* Display Details */}
      <div className="summary-box">
        <p>Amount: <strong>{amountToLend} KOIN</strong></p>
        <p>ROI: <strong>{roi !== null ? `${roi}%` : "Fetching..."}</strong> for 90 days</p>
        <p>Early Withdraw Fee: <strong>{earlyWithdrawFee}%</strong></p>
      </div>

      {/* Submit Button */}
      <button className="lend-btn" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Transaction"}
      </button>
    </div>
  );
};
