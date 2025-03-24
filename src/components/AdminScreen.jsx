import React, { useState, useEffect } from "react";
import "../styles/AdminScreen.css";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import escrowAbi from "../utils/escrowAbi.json"; // Import Escrow Contract ABI
import emailjs from "emailjs-com"; // Import EmailJS

const AdminScreen = () => {
  const { account, network } = useWallet();
  
  // State for processing transactions
  const [clientAddress, setClientAddress] = useState("");
  const [brokerAddress, setBrokerAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [dealStatus, setDealStatus] = useState("complete"); // New dropdown state
  const [processing, setProcessing] = useState(false);

  // State for sending emails
  const [email, setEmail] = useState("");
  const [emailClientAddress, setEmailClientAddress] = useState("");
  const [emailTokenType, setEmailTokenType] = useState("");
  const [emailAmount, setEmailAmount] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  const ESCROW_CONTRACT =
  network === "sepolia"
    ? process.env.REACT_APP_SEPOLIA_ESCROW_CONTRACT
    : process.env.REACT_APP_MAINNET_ESCROW_CONTRACT;

  const EMAILJS_SERVICE_ID = process.env.REACT_APP_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_TEMPLATE_ID;
  const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_PUBLIC_KEY;

 // Available tokens based on network
 const getTokensForNetwork = (network) => {
  if (network === "sepolia") {
    return [
      {
        symbol: "WETH",
        name: "Dummy Wrapped Ether",
        address: "0xe1396cf53fe2628147F8E055Ad0629517b3aB405",
        decimals: 18,
      },
    ];
  } else {
    return [
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2",
        decimals: 18,
      },
      {
        symbol: "DAI",
        name: "Dai Stablecoin",
        address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        decimals: 18,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
      },
    ];
  }
};

const tokens = getTokensForNetwork(network); // ✅ This re-evaluates when `network` changes


useEffect(() => {
  if (tokens.length > 0) {
    setSelectedToken(tokens[0].symbol);
    setEmailTokenType(tokens[0].symbol);
  }
}, [network, tokens]); // ✅ runs when network changes

    

  const checkAllowance = async (tokenAddress, owner, spender, amount) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function allowance(address owner, address spender) public view returns (uint256)"
      ], provider);
  
      const allowance = await tokenContract.allowance(owner, spender);
      console.log(`Allowance: ${ethers.utils.formatUnits(allowance, 18)} tokens`);
  
      if (ethers.BigNumber.from(allowance).lt(ethers.utils.parseUnits(amount, 18))) {
        alert(`Insufficient token approval! The client must approve at least ${amount} ${selectedToken} to the escrow contract.`);
        return false;
      }
  
      return true;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  };

  const processDeal = async () => {
    console.log("Inhere");
    if (!account || !clientAddress || !brokerAddress || !amount || !fee || !selectedToken) {
      alert("Please fill in all fields!");
      return;
    }
  
    const tokenData = tokens.find((t) => t.symbol === selectedToken);
    if (!tokenData) {
      alert("Invalid token selected!");
      return;
    }
  
    const amountWei = ethers.utils.parseUnits(amount, tokenData.decimals);
    const feeWei = ethers.utils.parseUnits(fee, tokenData.decimals);
    const isCompleted = dealStatus === "complete"; // Convert dropdown value to boolean
  
    // ✅ Step 1: Check if the client has approved enough tokens
    const isApproved = await checkAllowance(tokenData.address, clientAddress, ESCROW_CONTRACT, amount);
    if (!isApproved) {
      alert("The client has not approved you to process his deal yet!");
      return;
    }
    console.log(isApproved);
  
    try {
      setProcessing(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log("provider", provider);
      const signer = provider.getSigner();
      const escrowContract = new ethers.Contract(ESCROW_CONTRACT, escrowAbi, signer);
  
      console.log("clientAddress", clientAddress);
  
      // ✅ Step 2: Proceed with the deal since allowance is sufficient
      const tx = await escrowContract.processDeal(
        clientAddress,
        brokerAddress,
        tokenData.address,
        amountWei,
        feeWei,
        isCompleted
      );
      await tx.wait();
  
      alert("Deal processed successfully!");
    } catch (error) {
      console.error("Error processing deal:", error);
      alert("Transaction failed!");
    } finally {
      setProcessing(false);
    }
  };
  

  // Function to send approval email using EmailJS
  const sendApprovalEmail = async () => {
    if (!email || !emailClientAddress || !emailAmount || !emailTokenType) {
      alert("Please fill in all fields!");
      return;
    }

    try {
      setEmailSending(true);

      const WEBSITE_URL = process.env.REACT_APP_WEBSITE_URL;

      const approvalLink = `${WEBSITE_URL}/approval?client=${emailClientAddress}&token=${emailTokenType}&amount=${emailAmount}`;      const templateParams = {
        from_name: "DealGuard Team",
        client_address: emailClientAddress,
        selected_token: emailTokenType,
        amount: emailAmount,
        approval_link: approvalLink,
        email: email,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      alert("Approval email sent successfully!");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Email sending failed!");
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="section-title">Admin - Deal Transactions</h1>

      <div className="admin-sections-container">
        {/* Deal Processing Form */}
        <div className="admin-section">
          <h2>Process Deal</h2>
          <label>Client Address:</label>
          <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Enter client address" />

          <label>Broker Address:</label>
          <input type="text" value={brokerAddress} onChange={(e) => setBrokerAddress(e.target.value)} placeholder="Enter broker address" />

          <label>Select Token:</label>
          <select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
            {tokens.map((token) => (
              <option key={token.address} value={token.symbol}>{token.symbol} - {token.name}</option>
            ))}
          </select>

          <label>Amount:</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />

          <label>Fee:</label>
          <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Enter fee" />

          <label>Deal Status:</label>
          <select value={dealStatus} onChange={(e) => setDealStatus(e.target.value)}>
            <option value="complete">Complete</option>
            <option value="refund">Refund</option>
          </select>

          <button className="submit-button" onClick={processDeal} disabled={processing}>
            {processing ? "Processing..." : "Process Deal"}
          </button>
        </div>

        {/* Email Sending Form */}
        <div className="admin-section">
          <h2>Send Approval Email</h2>
          <label>Recipient Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter recipient's email" />

          <label>Client Address:</label>
          <input type="text" value={emailClientAddress} onChange={(e) => setEmailClientAddress(e.target.value)} placeholder="Enter client address" />

          <label>Select Token:</label>
          <select value={emailTokenType} onChange={(e) => setEmailTokenType(e.target.value)}>
            {tokens.map((token) => (
              <option key={token.address} value={token.symbol}>{token.symbol} - {token.name}</option>
            ))}
          </select>

          <label>Amount:</label>
          <input type="number" value={emailAmount} onChange={(e) => setEmailAmount(e.target.value)} placeholder="Enter amount" />

          <button className="submit-button" onClick={sendApprovalEmail} disabled={emailSending}>
            {emailSending ? "Sending..." : "Send Approval Request"}
          </button>
        </div>
        </div>
    </div>
  );
};

export default AdminScreen;
