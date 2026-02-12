const { RpcProvider, ec, hash, CallData } = require('starknet');
require('dotenv').config();

async function verifyAccount() {
    console.log('🔍 Verifying Account Setup');
    console.log('===========================\n');

    const provider = new RpcProvider({
        nodeUrl: process.env.RPC_URL || 'https://starknet-sepolia.infura.io/v3/525ebdb74cd1492ba8b114a26d233a45'
    });

    const privateKey = process.env.PRIVATE_KEY;
    const envAddress = process.env.ACCOUNT_ADDRESS;

    console.log('📋 From .env file:');
    console.log('   ACCOUNT_ADDRESS:', envAddress);
    console.log('   RPC_URL:', process.env.RPC_URL || 'https://starknet-sepolia.infura.io/v3/525ebdb74cd1492ba8b114a26d233a45');

    // Calculate what the address should be
    const starkKeyPub = ec.starkCurve.getStarkKey(privateKey);
    const OZaccountClassHash = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';
    const OZaccountConstructorCallData = CallData.compile({ publicKey: starkKeyPub });
    const calculatedAddress = hash.calculateContractAddressFromHash(
        starkKeyPub,
        OZaccountClassHash,
        OZaccountConstructorCallData,
        0
    );

    console.log('\n📐 Calculated from private key:');
    console.log('   Public Key:', starkKeyPub);
    console.log('   Calculated Address:', calculatedAddress);

    console.log('\n🔄 Checking both addresses on network...\n');

    // Check env address
    console.log('1️⃣ Checking .env address:', envAddress);
    try {
        const nonce = await provider.getNonceForAddress(envAddress);
        console.log('   ✅ Account EXISTS on network!');
        console.log('   Nonce:', nonce);
        console.log('   → This account can be used for deployment');
    } catch (error) {
        console.log('   ❌ Account NOT FOUND on network');
        console.log('   Error:', error.message);
    }

    // Check calculated address
    console.log('\n2️⃣ Checking calculated address:', calculatedAddress);
    try {
        const nonce = await provider.getNonceForAddress(calculatedAddress);
        console.log('   ✅ Account EXISTS on network!');
        console.log('   Nonce:', nonce);
        console.log('   → This account can be used for deployment');
    } catch (error) {
        console.log('   ❌ Account NOT FOUND on network');
        console.log('   Error:', error.message);
    }

    console.log('\n📝 Recommendations:');
    if (calculatedAddress.toLowerCase() !== envAddress.toLowerCase()) {
        console.log('   ⚠️  The addresses don\'t match!');
        console.log('   Option 1: Update ACCOUNT_ADDRESS in .env to:', calculatedAddress);
        console.log('   Option 2: Use a wallet (ArgentX/Braavos) to create and fund an account');
        console.log('   Option 3: Fund the calculated address and deploy it');
    }
}

verifyAccount().catch(console.error);
