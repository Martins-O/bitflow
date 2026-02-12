const { Account, RpcProvider, ec, hash, CallData } = require('starknet');
require('dotenv').config();

async function deployAccount() {
    console.log('🚀 Deploying Starknet Account');
    console.log('==============================\n');

    try {
        // Initialize provider
        const provider = new RpcProvider({
            nodeUrl: process.env.RPC_URL || 'https://starknet-sepolia.infura.io/v3/525ebdb74cd1492ba8b114a26d233a45'
        });

        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('PRIVATE_KEY not found in .env file');
        }

        // Get public key from private key
        const starkKeyPub = ec.starkCurve.getStarkKey(privateKey);
        console.log('📋 Public Key:', starkKeyPub);

        // OpenZeppelin account class hash (standard for Starknet Sepolia)
        const OZaccountClassHash = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';

        // Calculate account address
        const OZaccountConstructorCallData = CallData.compile({ publicKey: starkKeyPub });
        const OZcontractAddress = hash.calculateContractAddressFromHash(
            starkKeyPub,
            OZaccountClassHash,
            OZaccountConstructorCallData,
            0
        );

        console.log('📍 Calculated Account Address:', OZcontractAddress);
        console.log('   Expected Address from .env:', process.env.ACCOUNT_ADDRESS);

        // Check if addresses match
        if (OZcontractAddress.toLowerCase() !== process.env.ACCOUNT_ADDRESS.toLowerCase()) {
            console.log('\n⚠️  WARNING: Calculated address does not match ACCOUNT_ADDRESS in .env');
            console.log('   This might cause issues. Consider updating .env with the calculated address.');
        }

        // Check if account already exists
        try {
            const nonce = await provider.getNonceForAddress(OZcontractAddress);
            console.log('\n✅ Account already deployed!');
            console.log('   Nonce:', nonce);
            console.log('\nYou can now deploy contracts using: node scripts/deploy-v5.js');
            return;
        } catch (error) {
            if (!error.message.includes('Contract not found')) {
                throw error;
            }
            console.log('\n📝 Account not found on network. Proceeding with deployment...');
        }

        // Create account instance for deployment
        const account = new Account(provider, OZcontractAddress, privateKey);

        console.log('\n💰 Funding Required:');
        console.log('   Before deploying, you need to fund this account with testnet ETH');
        console.log('   Account Address:', OZcontractAddress);
        console.log('\n   Get testnet ETH from:');
        console.log('   - Starknet Sepolia Faucet: https://starknet-faucet.vercel.app/');
        console.log('   - Blast API Faucet: https://blastapi.io/faucets/starknet-sepolia-eth');
        console.log('\n⏳ Waiting for funds... (checking every 5 seconds)');

        // Wait for funding
        let balance = 0n;
        while (balance === 0n) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            try {
                const balanceResponse = await provider.getBalance(OZcontractAddress);
                balance = BigInt(balanceResponse);
                if (balance > 0n) {
                    console.log(`\n✅ Funds detected! Balance: ${balance} wei`);
                    break;
                }
            } catch (error) {
                // Account not funded yet
            }
        }

        // Deploy account
        console.log('\n🚀 Deploying account...');
        const { transaction_hash, contract_address } = await account.deployAccount({
            classHash: OZaccountClassHash,
            constructorCalldata: OZaccountConstructorCallData,
            addressSalt: starkKeyPub
        });

        console.log('   Transaction Hash:', transaction_hash);
        console.log('   ⏳ Waiting for transaction confirmation...');

        await provider.waitForTransaction(transaction_hash);

        console.log('\n🎉 Account deployed successfully!');
        console.log('   Address:', contract_address);
        console.log('\n✅ You can now deploy contracts using: node scripts/deploy-v5.js');

    } catch (error) {
        console.error('\n❌ Account deployment failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

if (require.main === module) {
    deployAccount();
}

module.exports = deployAccount;
