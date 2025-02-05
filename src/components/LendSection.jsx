import React, { useState } from "react";
import "../styles/LendSection.css";
import * as kondor from "kondor-js";
import { Contract, utils } from "koilib";
import abi from "../utils/lendingAbi.json"; // Import your contract ABI
import { useWallet } from "../context/WalletContext";

export const LendSection = () => {
  const [amountToLend, setAmountToLend] = useState(1000); // Default lend amount
  const [roi] = useState(3); // Default ROI: 3%
  const [earlyWithdrawFee] = useState(50); // 50% fee
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account } = useWallet();

  const LENDING_CONTRACT_ADDRESS = process.env.REACT_APP_LENDING_CONTRACT; // Replace with actual contract address
  const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_KOIN_TOKEN; // Replace with actual token contract address

  const handleSubmit = async () => {
    if (amountToLend <= 0) {
      alert("Please enter a valid amount to lend.");
      return;
    }

    if (!kondor) {
      alert("Please install the Kondor wallet to proceed.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Connect to Kondor and get the user's address
      
      const lenderAddress = account;

      // Contract instances
      const lendingContract = new Contract({
        id: LENDING_CONTRACT_ADDRESS,
        abi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER), // Update the network if needed
        signer: kondor.getSigner(lenderAddress),
      });

      const tokenContract = new Contract({
        id: TOKEN_CONTRACT_ADDRESS,
        abi: utils.tokenAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(lenderAddress),
      });

      // Check allowance for the lending contract
      const { result: allowance } = await tokenContract.functions.allowance({
        owner: lenderAddress,
        spender: LENDING_CONTRACT_ADDRESS,
      });

      if ((allowance?.value ?? 0) < amountToLend) {
        // Request approval if allowance is insufficient
        const approvalTx = await tokenContract.functions.approve({
          owner: lenderAddress,
          spender: LENDING_CONTRACT_ADDRESS,
          value: String(amountToLend), // Convert to string for compatibility
        });

        if (!approvalTx.receipt) {
          alert("Approval transaction failed.");
          return;
        }

        // Wait for the approval transaction to complete
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Execute a single lending transaction
      const args = {
        lender: lenderAddress,
        amount: amountToLend,
      };

      const { transaction, receipt } = await lendingContract.functions.deposit(args);

      // Extract `deadline for repayment` and `contract ID` from logs
      const logs = receipt?.logs || [];
      const deadlineLog = logs.find((log) => log.startsWith("Deadline for repayment:"));
      const contractIdLog = logs.find((log) => log.startsWith("Contract ID:"));

      const deadline = deadlineLog?.split(": ")[1];
      const contractId = contractIdLog?.split(": ")[1];

      if (!deadline || !contractId) {
        throw new Error("Failed to parse deadline or contract ID from transaction logs.");
      }

      // Prepare data for the POST API
      const apiData = {
        id: contractId,
        amount: amountToLend,
        roi,
        status: "Active",
        returnDate: new Date(parseInt(deadline)).toISOString().split("T")[0], // Convert to readable date format
        txId: transaction.id,
        lender: lenderAddress,
      };

      // Send data to the POST API
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/lend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error("Failed to save lend transaction to the backend.");
      }

      alert(`Successfully lent ${amountToLend} KOIN. TXID: ${transaction.id}`);
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
        <p>ROI: <strong>{roi}%</strong> for 90 days</p>
        <p>Early Withdraw Fee: <strong>{earlyWithdrawFee}%</strong></p>
      </div>

      {/* Submit Button */}
      <button
        className="lend-btn"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Transaction"}
      </button>
    </div>
  );
};
