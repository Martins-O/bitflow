import { starknet } from 'starknet';

class WalletService {
    constructor() {
        this.connected = false;
        this.account = null;
        this.address = null;
        this.provider = null;
    }

    async connect() {
        try {
            if (!window.starknet) {
                throw new Error('Starknet wallet not found. Please install Argent or Braavos wallet.');
            }

            // Discover wallet
            const [wallet] = await starknet.enable();
            if (!wallet) {
                throw new Error('No wallet found. Please connect your Starknet wallet.');
            }

            this.account = wallet;
            this.address = wallet.address;
            this.connected = true;
            this.provider = new starknet.RpcProvider({
                nodeUrl: 'https://starknet-testnet.infura.io/v3/YOUR_INFURA_KEY'
            });

            // Listen for account changes
            window.starknet.on('accountsChanged', this.handleAccountsChanged.bind(this));

            return {
                connected: true,
                address: this.address,
                wallet: wallet.name || 'Unknown Wallet'
            };
        } catch (error) {
            console.error('Wallet connection error:', error);
            throw new Error(`Failed to connect wallet: ${error.message}`);
        }
    }

    async disconnect() {
        try {
            if (window.starknet && window.starknet.disconnect) {
                await window.starknet.disconnect();
            }
            
            this.connected = false;
            this.account = null;
            this.address = null;
            this.provider = null;
            
            return { connected: false };
        } catch (error) {
            console.error('Wallet disconnection error:', error);
            throw new Error(`Failed to disconnect wallet: ${error.message}`);
        }
    }

    async isConnected() {
        try {
            if (!window.starknet) return false;
            
            const accounts = await window.starknet.request({ method: 'starknet_accounts' });
            return accounts && accounts.length > 0;
        } catch (error) {
            return false;
        }
    }

    async sendTransaction(contractAddress, entrypoint, calldata) {
        if (!this.connected || !this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const transaction = {
                contractAddress,
                entrypoint,
                calldata
            };

            const { transaction_hash } = await this.account.execute(transaction);
            
            // Wait for transaction to be accepted
            await this.waitForTransaction(transaction_hash);
            
            return {
                success: true,
                transactionHash: transaction_hash
            };
        } catch (error) {
            console.error('Transaction error:', error);
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }

    async waitForTransaction(transactionHash) {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }

        const maxRetries = 30;
        const retryDelay = 5000; // 5 seconds

        for (let i = 0; i < maxRetries; i++) {
            try {
                const receipt = await this.provider.getTransactionReceipt(transactionHash);
                if (receipt.status === 'ACCEPTED_ON_L1' || receipt.status === 'ACCEPTED_ON_L2') {
                    return receipt;
                }
            } catch (error) {
                // Transaction might not be processed yet, continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        throw new Error('Transaction confirmation timeout');
    }

    async getBalance(tokenAddress, userAddress = null) {
        const addressToCheck = userAddress || this.address;
        if (!addressToCheck) {
            throw new Error('No address provided to check balance');
        }

        try {
            const result = await this.provider.callContract({
                contractAddress: tokenAddress,
                entrypoint: 'balanceOf',
                calldata: [addressToCheck]
            });
            
            return result[0]; // Balance is returned as a string
        } catch (error) {
            console.error('Balance check error:', error);
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    async approveToken(tokenAddress, spenderAddress, amount) {
        if (!this.connected || !this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const transaction = {
                contractAddress: tokenAddress,
                entrypoint: 'approve',
                calldata: [spenderAddress, amount.toString()]
            };

            const { transaction_hash } = await this.account.execute(transaction);
            await this.waitForTransaction(transaction_hash);
            
            return {
                success: true,
                transactionHash: transaction_hash
            };
        } catch (error) {
            console.error('Token approval error:', error);
            throw new Error(`Failed to approve tokens: ${error.message}`);
        }
    }

    async getNetworkInfo() {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }

        try {
            const chainId = await this.provider.getChainId();
            const blockNumber = await this.provider.getBlockNumber();
            
            return {
                chainId,
                blockNumber,
                network: chainId === '0x534e5f5345504f4c4941' ? 'Sepolia' : 'Unknown'
            };
        } catch (error) {
            throw new Error(`Failed to get network info: ${error.message}`);
        }
    }

    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            // User disconnected their wallet
            this.connected = false;
            this.account = null;
            this.address = null;
            window.dispatchEvent(new CustomEvent('walletDisconnected'));
        } else {
            // User switched accounts
            this.address = accounts[0];
            window.dispatchEvent(new CustomEvent('accountChanged', { 
                detail: { address: accounts[0] } 
            }));
        }
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    isValidAddress(address) {
        return /^0x[a-fA-F0-9]{63,64}$/.test(address);
    }
}

export default WalletService;