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
  const [activeTxId, setActiveTxId] = useState(null); // Track active transaction
  const { account } = useWallet();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!account) return;

        // Fetch active borrow contracts
        const borrowResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/borrow?borrower=${account}&status=Active`
        );
        const borrowData = await borrowResponse.json();
        setBorrowContracts(Array.isArray(borrowData) ? borrowData : []);

        // Fetch active lend contracts
        const lendResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/lend?lender=${account}&status=Active`
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
  }, [account]);

  // ✅ Handle Claim Transaction
  const handleClaim = async (id) => {
    try {
      console.log(`🔹 Claiming deposit ID: ${id}`);
      setActiveTxId(id); // Show loading only on clicked button

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId: id, lender: account }),
      });

      const result = await response.json();
      console.log("🔹 Backend Response:", result);

      if (result.success) {
        alert(`Claim successful! TXID: ${result.txId}`);

        // Mark transaction as "Completed"
        setLendContracts((prevContracts) =>
          prevContracts.map((contract) =>
            contract.id === id ? { ...contract, status: "Completed" } : contract
          )
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ Error during claim transaction:", error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setActiveTxId(null); // Reset loading state
    }
  };

  // ✅ Handle Repay Transaction
  const handleRepay = async (id, repaymentAmount) => {
    const tokenAddress = process.env.REACT_APP_KOIN_TOKEN;
    try {
      console.log(`🔹 Repaying contract ID: ${id}`);
      setActiveTxId(id); // Show loading only on clicked button

      const borrowerAddress = account;
      let borrowContractAddress = process.env.REACT_APP_BORROW_CONTRACT;

      const borrowContract = new Contract({
        id: borrowContractAddress,
        abi: borrowAbi,
        provider: kondor.getProvider(process.env.REACT_APP_PROVIDER),
        signer: kondor.getSigner(borrowerAddress),
      });

      const args = {
        borrower: borrowerAddress,
        repayment: repaymentAmount * 100000000,
        contract_id: id,
      };

      console.log("📜 Repayment Transaction Args:", args);
      console.log("🚀 Sending Repayment Transaction...");
      const { transaction, receipt } = await borrowContract.functions.repayFunds(args);

      console.log("✅ Transaction Sent! Waiting for confirmation...");
      if (receipt) {
        console.log("✅ Repayment Successful!");
        alert(`✅ Repaid contract with ID: ${id} \nTransaction ID: ${transaction.id}`);

        // Mark transaction as "Completed"
        setBorrowContracts((prevContracts) =>
          prevContracts.map((contract) =>
            contract.id === id ? { ...contract, status: "Completed" } : contract
          )
        );

        // Update backend status
        await fetch(`${process.env.REACT_APP_API_BASE_URL}/borrow/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Completed" }),
        });
      } else {
        throw new Error("❌ Repayment transaction failed.");
      }
    } catch (error) {
      console.error("❌ Error during repayment:", error);
      alert(`❌ An error occurred: ${error.message}`);
    } finally {
      setActiveTxId(null); // Reset loading state
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
                    {borrowContracts.map((contract) => (
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
                            disabled={activeTxId !== null || contract.status === "Completed"}
                          >
                            {activeTxId === contract.id ? "⏳ Processing..." : "Repay"}
                          </button>
                        </td>
                      </tr>
                    ))}
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
                          <span className={`status ${contract.status.toLowerCase()}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td>{new Date(contract.returnDate).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="action-btn"
                            onClick={() => handleClaim(contract.id)}
                            disabled={activeTxId !== null || contract.status === "Completed"}
                          >
                            {activeTxId === contract.id ? "⏳ Processing..." : "Claim"}
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
