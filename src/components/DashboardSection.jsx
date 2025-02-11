import React, { useState, useEffect } from "react";
import "../styles/DashboardSection.css";
import * as kondor from "kondor-js";
import { Contract, utils } from "koilib";
import borrowAbi from "./../utils/borrowAbi.json";
import lendingAbi from "./../utils/lendingAbi.json";
import { useWallet } from "../context/WalletContext";


const DashboardSection = () => {
  const [borrowContracts, setBorrowContracts] = useState([]);
  const [lendContracts, setLendContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { account } = useWallet();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
  
        if (!account) {
          console.warn("No wallet connected. Skipping data fetch.");
          return;
        }
  
        // Fetch borrow contracts (pass borrower address)
        const borrowResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/borrow?borrower=${account}`
        );
        const borrowData = await borrowResponse.json();
        setBorrowContracts(Array.isArray(borrowData) ? borrowData : []);
  
        // Fetch lend contracts (pass lender address)
        const lendResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/lend?lender=${account}`
        );
        const lendData = await lendResponse.json();
        setLendContracts(Array.isArray(lendData) ? lendData : []);
  
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to fetch contract data.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [account]); // Re-run the effect when the account changes
  

  // Action Handlers
  const handleClaim = async (id) => {
    try {
      const lenderAddress = account;
      const lendContract = new Contract({
        id: process.env.REACT_APP_LENDING_CONTRACT,
        abi: lendingAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(lenderAddress),
      });

      // Transaction arguments
      const args = {
        lender: lenderAddress,
        deposit_id: id,
      };
  
      // Call `repayFunds` method
      const { transaction, receipt } = await lendContract.functions.withdraw(args);
  
      // Check transaction receipt
      if (receipt) {
        alert(`Repaid contract with ID: ${id} and transaction ID: ${transaction.id}`);
  
        // Call the DELETE API to remove the borrow transaction
        await deleteLendTransaction(id);
      } else {
        throw new Error("Withdraw transaction failed.");
      }
    } catch (error) {
      console.error("Error during withdrawing payment:", error);
      alert("An error occurred during withdrawal. Check the console for details.");
    }
  };

  const handleRepay = async (id, repaymentAmount) => {
    // Token contract addresses (Replace with actual contract IDs)

    const tokenAddress = process.env.REACT_APP_KOIN_TOKEN;

    try {
      const borrowerAddress = account;

      let borrowContractAddress = process.env.REACT_APP_BORROW_CONTRACT;
  
      // Borrow contract instance
      const borrowContract = new Contract({
        id: borrowContractAddress,
        abi: borrowAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(borrowerAddress),
      });
  
      const tokenContract = new Contract({
        id: tokenAddress,
        abi: utils.tokenAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(borrowerAddress),
      });
  
      // Check allowance for the Borrow contract
      const { result: allowance } = await tokenContract.functions.allowance({
        owner: borrowerAddress,
        spender: borrowContractAddress,
      });
  
      if ((allowance?.value ?? 0) < repaymentAmount) {
        // Request approval if allowance is insufficient
        const approvalTx = await tokenContract.functions.approve({
          owner: borrowerAddress,
          spender: borrowContractAddress,
          value: String(repaymentAmount),
        });
        if (!approvalTx.receipt) {
          alert("Approval transaction failed.");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
  
      // Transaction arguments
      const args = {
        borrower: borrowerAddress,
        repaymentAmount,
        contract_id: id,
      };
  
      // Call `repayFunds` method
      const { transaction, receipt } = await borrowContract.functions.repayFunds(args);
  
      // Check transaction receipt
      if (receipt) {
        alert(`Repaid contract with ID: ${id} and transaction ID: ${transaction.id}`);
  
        // Call the DELETE API to remove the borrow transaction
        await deleteBorrowTransaction(id);
      } else {
        throw new Error("Repayment transaction failed.");
      }
    } catch (error) {
      console.error("Error during loan repayment:", error);
      alert("An error occurred during repayment. Check the console for details.");
    }
  };
  
  // Function to delete a borrow transaction
  const deleteBorrowTransaction = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/borrow/${id}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        throw new Error("Failed to delete borrow transaction.");
      }
  
      const result = await response.json();
      console.log("Borrow transaction deleted:", result);
      alert("Borrow transaction deleted successfully.");
    } catch (error) {
      console.error("Error deleting borrow transaction:", error);
      alert("Failed to delete borrow transaction. Check console for details.");
    }
  };
  

  // Function to delete a borrow transaction
  const deleteLendTransaction = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/borrow/${id}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        throw new Error("Failed to delete borrow transaction.");
      }
  
      const result = await response.json();
      console.log("Borrow transaction deleted:", result);
      alert("Borrow transaction deleted successfully.");
    } catch (error) {
      console.error("Error deleting borrow transaction:", error);
      alert("Failed to delete borrow transaction. Check console for details.");
    }
  };
  
  return (
    <div className="dashboard-container">
      <h1 className="section-title">Dashboard</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Borrow Contracts */}
          <div className="contract-section">
            <h2>Borrow Contracts</h2>
            {borrowContracts.length === 0 ? (
              <p>No active borrow contracts.</p>
            ) : (
              <div className="table-container">
                <table className="contract-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Token</th>
                      <th>Amount (KOIN)</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                  {Array.isArray(borrowContracts) && borrowContracts.length > 0 ? (
                    borrowContracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>{contract.id}</td>
                        <td>{contract.token}</td>
                        <td>{contract.amount}</td>
                        <td>
                          <span className={`status ${contract.status.toLowerCase()}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td>{new Date(contract.dueDate).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="action-btn"
                            onClick={() => handleRepay(contract.id, contract.amount)}
                          >
                            Repay
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">No active borrow contracts.</td>
                    </tr>
                  )}
                </tbody>

                </table>
              </div>
            )}
          </div>

          {/* Lend Contracts */}
          <div className="contract-section">
            <h2>Lend Contracts</h2>
            {lendContracts.length === 0 ? (
              <p>No active lend contracts.</p>
            ) : (
              <div className="table-container">
                <table className="contract-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount (KOIN)</th>
                      <th>ROI</th>
                      <th>Status</th>
                      <th>Return Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lendContracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>{contract.id}</td>
                        <td>{contract.amount}</td>
                        <td>{contract.roi}%</td>
                        <td>
                          <span
                            className={`status ${contract.status.toLowerCase()}`}
                          >
                            {contract.status}
                          </span>
                        </td>
                        <td>
                          {new Date(contract.returnDate).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="action-btn"
                            onClick={() => handleClaim(contract.id)}
                          >
                            Claim
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardSection;
