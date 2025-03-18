import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom"; // ✅ Used for redirection
import "../styles/ApprovalSection.css";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import erc20Abi from "../utils/erc20Abi.json"; // Standard ERC-20 ABI

export const ApprovalSection = () => {
  const { account, setAccount, network } = useWallet();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // ✅ Used for redirection
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  //const provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_API_URL);

  // Get values from URL
  const tokenSymbol = searchParams.get("token") || "";
  const approvalAmount = searchParams.get("amount") || "";
  const approvalClientAddress = searchParams.get("client") || ""; // ✅ Client wallet address from URL
  const SPENDER_ADDRESS = searchParams.get("spender") || process.env.REACT_APP_SEPOLIA_ESCROW_CONTRACT; // ✅ Spender address from URL or env

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowance, setAllowance] = useState(null);
  const [walletMismatch, setWalletMismatch] = useState(false); // ✅ Track if wrong wallet is connected

  const tokens =
  network === "sepolia"
    ? [
        {
          symbol: "Dummy WETH",
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
    if (account && approvalClientAddress) {
      if (account.toLowerCase() !== approvalClientAddress.toLowerCase()) {
        setWalletMismatch(true);
      } else {
        setWalletMismatch(false);
        fetchAllowance();
      }
    }
  }, [account, approvalClientAddress]);

  const fetchAllowance = async () => {
    console.log("Hey");
    if (!account || !tokenData || !SPENDER_ADDRESS) return;

    console.log("Heya");

    try {
      console.log(provider);
      const contract = new ethers.Contract(tokenData.address, erc20Abi, provider);
      console.log("contract", contract);

      const currentAllowance = await contract.allowance(account, SPENDER_ADDRESS);
      setAllowance(ethers.utils.formatUnits(currentAllowance, tokenData.decimals));
    } catch (error) {
      console.error("Error fetching allowance:", error);
      setAllowance(null);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to continue.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const handleApproval = async () => {
    if (!account) {
      alert("Please connect your wallet.");
      return;
    }
    if (!SPENDER_ADDRESS) {
      alert("Spender address is not set. Check your .env file.");
      return;
    }
    if (!tokenData) {
      alert("Invalid token selected.");
      return;
    }

    try {
      setIsSubmitting(true);

      const signer = provider.getSigner();

      const tokenContract = new ethers.Contract(tokenData.address, erc20Abi, signer);

      const amountInWei = ethers.utils.parseUnits(approvalAmount, tokenData.decimals);
      const tx = await tokenContract.approve(SPENDER_ADDRESS, amountInWei);
      await tx.wait();

      alert(`Approval successful! TX: ${tx.hash}`);
      fetchAllowance(); // Refresh allowance after approval
    } catch (error) {
      console.error("Error during approval:", error);
      alert("An error occurred. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (walletMismatch) {
    return (
      <div className="approval-container">
        <h1>Incorrect Wallet Connected</h1>
        <p>Please connect with the correct wallet to approve this transaction.</p>
      </div>
    );
  }

  return (
    <div className="approval-container">
      <h1 className="section-title">Approve Token Spending</h1>

      <div className="input-group">
        <label>Token:</label>
        <input 
          type="text" 
          value={tokenData ? `${tokenData.symbol} - ${tokenData.name}` : "Unknown Token"} 
          disabled 
        />
      </div>

      <div className="input-group">
        <label>Approval Amount:</label>
        <input type="text" value={approvalAmount} disabled />
      </div>

      <div className="info-box">
        <p>This approval allows the spender to use your tokens.</p>
        <p>Spender: <strong>{SPENDER_ADDRESS ? SPENDER_ADDRESS : "Not Set"}</strong></p>
        <p>Current Allowance: <strong>{allowance !== null ? `${allowance} ${tokenSymbol}` : "Fetching..."}</strong></p>
      </div>

      <div className="approve-btn-container">
    <button 
        className={`approve-btn ${isSubmitting ? "loading" : ""}`} 
        onClick={handleApproval} 
        disabled={isSubmitting}
    >
        {isSubmitting ? <div className="loader"></div> : <span>Approve</span>}
    </button>
</div>


    </div>
  );
};
