const { RpcProvider } = require('starknet');
require('dotenv').config();

async function checkBalance() {
    const provider = new RpcProvider({
        nodeUrl: process.env.RPC_URL || 'https://starknet-sepolia.infura.io/v3/525ebdb74cd1492ba8b114a26d233a45'
    });

    const address = '0x604d4004728ab54d23eb0a0c1eba86e46d8c46aade7a6d8b7742d88493c276d';

    console.log('Checking balance for:', address);

    try {
        const balance = await provider.getBalance(address);
        console.log('Balance:', balance, 'wei');
        console.log('Balance in ETH:', Number(balance) / 1e18);
    } catch (error) {
        console.log('Error:', error.message);
    }
}

checkBalance();
