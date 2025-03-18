import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/App.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ApprovalSection } from "./components/ApprovalSection";
import AdminScreen from "./components/AdminScreen";
import { WalletProvider, useWallet } from "./context/WalletContext";

// ✅ Page Layout with Header & Footer (For Main Pages)
const PageLayout = ({ children }) => (
  <div className="app-container">
    <Header />
    <main className="main-content">{children}</main>
    <Footer />
  </div>
);

// ✅ Admin Panel Page (Only for Admin)
const Admin = () => {
  const { account } = useWallet();
  const adminWalletAddress = process.env.REACT_APP_ADMIN_WALLET;

  // ✅ If Admin Wallet is Not Connected, Show Message
  if (!account || account.toLowerCase() !== adminWalletAddress?.toLowerCase()) {
    return (
      <PageLayout>
        <div className="non-admin-message">
          <h2>Access Denied</h2>
          <p>You are not connected with the Admin wallet.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <AdminScreen />
    </PageLayout>
  );
};

// ✅ Main App Component
const App = () => {
  return (
    <Router>
      <Routes>
        {/* ✅ Admin Route (Only Admins can access) */}
        <Route path="/admin" element={<Admin />} />

        {/* ✅ Approval Page (Separate Page) */}
        <Route
          path="/approval"
          element={
            <PageLayout>
              <ApprovalSection />
            </PageLayout>
          }
        />

        {/* ✅ Default Route Redirects to Admin Page */}
        <Route path="/" element={<Admin />} />
      </Routes>
    </Router>
  );
};

// ✅ Export App Wrapped with WalletProvider
export default () => (
  <WalletProvider>
    <App />
  </WalletProvider>
);
