import React, { useState, useEffect } from "react";
import "../styles/LendSection.css";
import * as kondor from "kondor-js";
import { Contract, utils } from "koilib";
import abi from "../utils/lendingAbi.json"; // Lending Contract ABI
import { useWallet } from "../context/WalletContext";

export const LendSection = () => {
  const [amountToLend, setAmountToLend] = useState(1000);
  const [roi, setROI] = useState(null);
  const [earlyWithdrawFee] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account } = useWallet();
  const [tokenDecimals, setTokenDecimals] = useState(8); // Default to 8 decimals

  const LENDING_CONTRACT_ADDRESS = process.env.REACT_APP_LENDING_CONTRACT;
  const PROVIDER_URL = process.env.REACT_APP_PROVIDER;
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_KOIN_TOKEN;

  // **🔹 Fetch Token Decimals**
  useEffect(() => {
    const fetchTokenDecimals = async () => {
      try {
        console.log("Fetching token decimals...");

        const tokenContract = new Contract({
          id: TOKEN_CONTRACT_ADDRESS,
          abi: utils.tokenAbi, // Simplified ABI for decimals
          provider: kondor.getProvider(PROVIDER_URL),
        });

        const { result } = await tokenContract.functions.decimals();

        if (result?.value !== undefined) {
          setTokenDecimals(parseInt(result.value));
          console.log("Token Decimals:", result.value);
        } else {
          console.warn("Failed to fetch token decimals, using default (8).");
        }
      } catch (error) {
        console.error("Error fetching token decimals:", error);
      }
    };

    fetchTokenDecimals();
  }, [TOKEN_CONTRACT_ADDRESS, PROVIDER_URL]);

  // **🔹 Fetch Lending Rate from Contract**
  useEffect(() => {
    const fetchLendingRate = async () => {
      try {
        console.log("Fetching lending rate...");

        const lendingContract = new Contract({
          id: LENDING_CONTRACT_ADDRESS,
          abi,
          provider: kondor.getProvider(PROVIDER_URL),
        });

        const { result } = await lendingContract.functions.getLendingRate();
        if (result?.value !== undefined) {
          setROI(parseInt(result.value));
          console.log("Lending Rate:", result.value);
        } else {
          setROI(0);
          console.log("Lending rate is 0");
        }
      } catch (error) {
        console.error("Error fetching lending rate:", error);
      }
    };

    fetchLendingRate();
  }, [LENDING_CONTRACT_ADDRESS, PROVIDER_URL]);

// **🔹 Handle Lending Submission**
const handleSubmit = async () => {
  if (amountToLend <= 0) {
    alert("❌ Please enter a valid amount to lend.");
    return;
  }

  if (!account) {
    alert("⚠️ Please connect your wallet first.");
    return;
  }

  try {
    setIsSubmitting(true);
    console.log("Submitting lend transaction...");

    // **🔹 Convert Human-Readable Amount to Blockchain Format**
    /* global BigInt */
    const scaledAmount = BigInt(amountToLend * 10 ** tokenDecimals).toString();
    console.log(`Scaled Amount: ${scaledAmount} (Original: ${amountToLend})`);

    // **🔹 Token Contract Instance**
    const tokenContract = new Contract({
      id: TOKEN_CONTRACT_ADDRESS, // Replace with your token contract address
      abi: utils.tokenAbi,
      provider: kondor.getProvider(PROVIDER_URL),
      signer: kondor.getSigner(account),
    });

    // **🔹 Check User Balance**
    console.log(`Checking balance for ${account}...`);
    const { result: balanceResult } = await tokenContract.functions.balanceOf({
      owner: account,
    });

    const userBalance = balanceResult?.value ? BigInt(balanceResult.value) : BigInt(0);
    console.log(`User Balance: ${userBalance}`);

    // **🔹 Ensure User Has Enough Balance**
    if (userBalance < BigInt(scaledAmount)) {
      alert("❌ Insufficient balance. You do not have enough tokens to deposit.");
      setIsSubmitting(false);
      return;
    }

    console.log("✅ User has sufficient balance. Proceeding with deposit...");

    // **🔹 Lending Contract Instance**
    const lendingContract = new Contract({
      id: LENDING_CONTRACT_ADDRESS,
      abi,
      provider: kondor.getProvider(PROVIDER_URL),
      signer: kondor.getSigner(account),
    });

    // **🔹 Transaction Arguments**
    const args = {
      lender: account,
      amount: scaledAmount, // Send scaled amount
    };

    console.log("Lending Transaction Args:", args);

    const { transaction, receipt } = await lendingContract.functions.deposit(args);

    if (receipt) {
      console.log("✅ Transaction successful:", transaction);

      // Extract logs for return date and contract ID
      const logs = receipt?.logs || [];
      console.log("Transaction logs:", logs);

      const deadlineLog = logs.find((log) => log.startsWith("Deadline for repayment:"));
      const contractIdLog = logs.find((log) => log.startsWith("Contract ID:"));

      const deadline = deadlineLog?.split(": ")[1];
      const contractId = contractIdLog?.split(": ")[1];

      if (!deadline || !contractId) {
        throw new Error("⚠️ Failed to parse deadline or contract ID from transaction logs.");
      }

      // **🔹 Prepare API Data**
      const lendData = {
        id: contractId,
        amount: amountToLend, // Store human-readable amount in DB
        roi,
        status: "Active",
        returnDate: new Date(parseInt(deadline)).toISOString().split("T")[0], // Convert to readable date
        txId: transaction.id,
        lender: account,
      };

      console.log("📤 Sending transaction data to backend:", lendData);

      // **🔹 Send Data to Backend**
      const response = await fetch(`${API_BASE_URL}/lend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lendData),
      });

      if (!response.ok) {
        throw new Error("❌ Failed to save lend transaction to the backend.");
      }

      alert(`✅ Successfully lent ${amountToLend} KOIN. TXID: ${transaction.id}`);
    } else {
      throw new Error("❌ Transaction failed.");
    }
  } catch (error) {
    console.error("Error during lending:", error);
    alert(error.message || "❌ An unexpected error occurred.");
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
