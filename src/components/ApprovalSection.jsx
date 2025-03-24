import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/ApprovalSection.css";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import erc20Abi from "../utils/erc20Abi.json";

export const ApprovalSection = () => {
  const { account, setAccount, network } = useWallet();
  const [searchParams] = useSearchParams();

  const tokenSymbol = searchParams.get("token") || "";
  const approvalAmount = searchParams.get("amount") || "";
  const approvalClientAddress = searchParams.get("client") || "";
  const SPENDER_ADDRESS = searchParams.get("spender") || process.env.REACT_APP_SEPOLIA_ESCROW_CONTRACT;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowance, setAllowance] = useState(null);
  const [walletMismatch, setWalletMismatch] = useState(false);
  const [provider, setProvider] = useState(null);

  const tokens =
    network === "sepolia"
      ? [
          {
            symbol: "WETH",
            name: "Dummy Wrapped Ether",
            address: "0xe1396cf53fe2628147F8E055Ad0629517b3aB405",
            decimals: 18,
          },
        ]
      : [
          { symbol: "WETH", name: "Wrapped Ether", address: "0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2", decimals: 18 },
          { symbol: "DAI", name: "Dai Stablecoin", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
          { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
          { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
        ];

  const tokenData = tokens.find((t) => t.symbol === tokenSymbol);

  useEffect(() => {
    if (window.ethereum) {
      setProvider(new ethers.providers.Web3Provider(window.ethereum));
    }
  }, []);

  useEffect(() => {
    console.log("account:", account);
    console.log("approvalClientAddress:", approvalClientAddress);
    if (!account || !approvalClientAddress) return;

    if (account.toLowerCase() !== approvalClientAddress.toLowerCase()) {
      setWalletMismatch(true);
    } else {
      setWalletMismatch(false);
      fetchAllowance();
    }
  }, [account, approvalClientAddress, tokenSymbol, network]);

  const fetchAllowance = async () => {
    if (!provider || !tokenData || !SPENDER_ADDRESS || !account) return;

    try {
      const contract = new ethers.Contract(tokenData.address, erc20Abi, provider);
      const currentAllowance = await contract.allowance(account, SPENDER_ADDRESS);
      setAllowance(ethers.utils.formatUnits(currentAllowance, tokenData.decimals));
    } catch (error) {
      console.error("Error fetching allowance:", error);
      setAllowance(null);
    }
  };

  // const connectWallet = async () => {
  //   if (!window.ethereum) {
  //     alert("MetaMask is not installed.");
  //     return;
  //   }

  //   try {
  //     const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
  //     await web3Provider.send("eth_requestAccounts", []);
  //     const signer = web3Provider.getSigner();
  //     const address = await signer.getAddress();
  //     setAccount(address);
  //   } catch (error) {
  //     console.error("Wallet connection failed:", error);
  //   }
  // };

  const handleApproval = async () => {
    if (!account) return alert("Please connect your wallet.");
    if (!SPENDER_ADDRESS) return alert("Spender address is missing.");
    if (!tokenData) return alert("Invalid token.");

    try {
      setIsSubmitting(true);
      const signer = provider.getSigner();
      const tokenContract = new ethers.Contract(tokenData.address, erc20Abi, signer);
      const amountInWei = ethers.utils.parseUnits(approvalAmount, tokenData.decimals);
      const tx = await tokenContract.approve(SPENDER_ADDRESS, amountInWei);
      await tx.wait();
      alert(`Approval successful! TX: ${tx.hash}`);
      fetchAllowance();
    } catch (error) {
      console.error("Approval error:", error);
      alert("Approval failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If wallet not connected
  if (!account) {
    return (
      <div className="approval-container">
        <h1>Connect Your Wallet</h1>
        <p>You need to connect your wallet to approve token spending.</p>
        {/* <button className="approve-btn" onClick={connectWallet}>Connect Wallet</button> */}
      </div>
    );
  }

  // If wrong wallet is connected
  if (walletMismatch) {
    return (
      <div className="approval-container">
        <h1>Incorrect Wallet Connected</h1>
        <p>Please switch to the correct wallet: {approvalClientAddress}</p>
        {/* <button className="approve-btn" onClick={connectWallet}>Reconnect</button> */}
      </div>
    );
  }

  return (
    <div className="approval-container">
      <h1 className="section-title">Approve Token Spending</h1>

      <div className="input-group">
        <label>Token:</label>
        <input type="text" value={tokenData ? `${tokenData.symbol} - ${tokenData.name}` : "Unknown Token"} disabled />
      </div>

      <div className="input-group">
        <label>Approval Amount:</label>
        <input type="text" value={approvalAmount} disabled />
      </div>

      <div className="info-box">
        <p>This approval allows the spender to use your tokens.</p>
        <p><strong>Spender:</strong> {SPENDER_ADDRESS}</p>
        <p><strong>Current Allowance:</strong> {allowance !== null ? `${allowance} ${tokenSymbol}` : "Fetching..."}</p>
      </div>

      <div className="approve-btn-container">
        <button className={`approve-btn ${isSubmitting ? "loading" : ""}`} onClick={handleApproval} disabled={isSubmitting}>
          {isSubmitting ? <div className="loader"></div> : <span>Approve</span>}
        </button>
      </div>
    </div>
  );
};
