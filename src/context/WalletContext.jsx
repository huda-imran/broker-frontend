import React, { createContext, useState, useContext } from "react";

// Create a Context
const WalletContext = createContext();

// Custom Hook for easy access
export const useWallet = () => useContext(WalletContext);

// Wallet Provider Component
export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);

  return (
    <WalletContext.Provider value={{ account, setAccount }}>
      {children}
    </WalletContext.Provider>
  );
};
