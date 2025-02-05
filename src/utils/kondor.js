export const isKondorInstalled = () => {
    console.log(window.kondor);
    return typeof window.kondor !== "undefined";
};

export const getKondorAccount = async() => {
    if (!isKondorInstalled()) {
        throw new Error("Kondor Wallet is not installed!");
    }

    try {
        // Request user to connect their wallet
        const accounts = await window.kondor.requestAccounts();
        return accounts[0]; // Return the first connected account
    } catch (error) {
        console.error("Failed to fetch account:", error);
        throw new Error("Failed to connect to Kondor Wallet.");
    }
};