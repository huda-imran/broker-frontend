import React, { useState, useEffect } from "react";
import "./styles/App.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { BorrowSection } from "./components/BorrowSection";
import { LendSection } from "./components/LendSection";
import DashboardSection from "./components/DashboardSection";
import AdminScreen from "./components/AdminScreen";
import { WalletProvider, useWallet } from "./context/WalletContext";

const App = () => {
  const [activeSection, setActiveSection] = useState("lend"); // State for section navigation
  const { account } = useWallet(); // Get wallet state from context
  const [isAdmin, setIsAdmin] = useState(false); // Track if the user is an admin

  // Admin wallet address (add to `.env`)
  const adminWalletAddress = process.env.REACT_APP_ADMIN_WALLET;

  // Check if the connected wallet is the admin wallet
  useEffect(() => {
    if (account && adminWalletAddress) {
      setIsAdmin(account === adminWalletAddress); // Check if the wallet matches the admin's wallet
    } else {
      setIsAdmin(false);
    }
  }, [account, adminWalletAddress]);

  // Redirect to connect wallet if no account is connected
  if (!account) {
    return (
      <div className="app-container">
      <Header setActiveSection={setActiveSection} />
        <div className="connect-wallet-container">
          <h1>Welcome to Koinos</h1>
          <p>Please connect your wallet to use the application.</p>
        </div>
        <Footer />
      </div>
      
    );
  }

  return (
    <div className="app-container">
      <Header setActiveSection={setActiveSection} />
      <main className="main-content">
        {activeSection === "borrow" && <BorrowSection />}
        {activeSection === "lend" && <LendSection />}
        {activeSection === "dashboard" && <DashboardSection />}
        {isAdmin && activeSection === "admin" && <AdminScreen />}
      </main>
      <Footer />
    </div>
  );
};

export default () => (
  <WalletProvider>
    <App />
  </WalletProvider>
);
