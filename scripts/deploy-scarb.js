const starknet = require('starknet');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class ScarbDeployer {
    constructor() {
        this.provider = null;
        this.account = null;
        this.contractsDir = path.join(__dirname, '../contracts/target/dev');
    }

    async initialize() {
        console.log('🔧 Initializing Starknet connection...\n');

        // Initialize provider
        const rpcUrl = process.env.RPC_URL || 'https://starknet-sepolia.infura.io/v3/525ebdb74cd1492ba8b114a26d233a45';
        this.provider = new starknet.RpcProvider({ nodeUrl: rpcUrl });

        console.log(`📡 Connected to: ${rpcUrl}`);

        // Initialize account
        if (!process.env.PRIVATE_KEY || !process.env.ACCOUNT_ADDRESS) {
            throw new Error('❌ Please set PRIVATE_KEY and ACCOUNT_ADDRESS in .env file');
        }

        this.account = new starknet.Account(
            this.provider,
            process.env.ACCOUNT_ADDRESS,
            process.env.PRIVATE_KEY,
            '1' // Cairo version
        );

        console.log(`👤 Account: ${this.account.address}\n`);
    }

    async deployAll() {
        console.log('🚀 BitFlow Contract Deployment');
        console.log('================================\n');

        try {
            await this.initialize();

            // Step 1: Deploy WrappedBTC
            console.log('📄 Step 1/4: Deploying WrappedBTC...');
            const wbtcAddress = await this.deployWrappedBTC();
            console.log(`✅ WrappedBTC deployed at: ${wbtcAddress}\n`);

            // Step 2: Deploy InvoiceRegistry (with temporary escrow address)
            console.log('📋 Step 2/4: Deploying InvoiceRegistry...');
            const invoiceRegistryAddress = await this.deployInvoiceRegistry(wbtcAddress);
            console.log(`✅ InvoiceRegistry deployed at: ${invoiceRegistryAddress}\n`);

            // Step 3: Deploy Escrow
            console.log('🔒 Step 3/4: Deploying Escrow...');
            const escrowAddress = await this.deployEscrow(wbtcAddress, invoiceRegistryAddress);
            console.log(`✅ Escrow deployed at: ${escrowAddress}\n`);

            // Step 4: Link Escrow to InvoiceRegistry
            console.log('🔗 Step 4/4: Linking Escrow to InvoiceRegistry...');
            await this.linkEscrow(invoiceRegistryAddress, escrowAddress);
            console.log('✅ Escrow linked successfully\n');

            // Update environment file
            await this.updateEnvironment(wbtcAddress, invoiceRegistryAddress, escrowAddress);

            console.log('\n🎉 Deployment Complete!');
            console.log('========================\n');
            console.log('Contract Addresses:');
            console.log(`  WrappedBTC:       ${wbtcAddress}`);
            console.log(`  InvoiceRegistry:  ${invoiceRegistryAddress}`);
            console.log(`  Escrow:           ${escrowAddress}`);
            console.log('\n✅ Addresses saved to .env file');
            console.log('\n💡 Next steps:');
            console.log('  1. Mint test tokens: npm run mint-tokens setup');
            console.log('  2. Start backend: npm start');
            console.log('  3. Run demo: npm run demo\n');

        } catch (error) {
            console.error('\n❌ Deployment failed:', error.message);
            if (error.stack) {
                console.error('\nStack trace:', error.stack);
            }
            throw error;
        }
    }

    async deployWrappedBTC() {
        const contractName = 'bitflow_contracts_WrappedBTC';
        const sierraPath = path.join(this.contractsDir, `${contractName}.contract_class.json`);
        const casmPath = path.join(this.contractsDir, `${contractName}.compiled_contract_class.json`);

        // Read compiled contract
        const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));
        const casm = JSON.parse(fs.readFileSync(casmPath, 'utf8'));

        console.log('  📦 Declaring contract...');

        // Declare the contract
        const declareResponse = await this.account.declareIfNot({
            contract: sierra,
            casm: casm,
        });

        if (declareResponse.transaction_hash) {
            console.log(`  ⏳ Waiting for declaration: ${declareResponse.transaction_hash}`);
            await this.provider.waitForTransaction(declareResponse.transaction_hash);
        }

        const classHash = declareResponse.class_hash;
        console.log(`  ✅ Class hash: ${classHash}`);

        // Prepare constructor calldata
        const name = starknet.shortString.encodeShortString('Wrapped Bitcoin');
        const symbol = starknet.shortString.encodeShortString('WBTC');
        const decimals = 8; // Bitcoin uses 8 decimals
        const initialSupply = '100000000000000'; // 1M BTC (8 decimals)
        const owner = this.account.address;

        const constructorCalldata = starknet.CallData.compile({
            name,
            symbol,
            decimals,
            initial_supply: initialSupply,
            owner,
        });

        console.log('  🚀 Deploying contract...');

        // Deploy the contract
        const deployResponse = await this.account.deployContract({
            classHash,
            constructorCalldata,
        });

        console.log(`  ⏳ Waiting for deployment: ${deployResponse.transaction_hash}`);
        await this.provider.waitForTransaction(deployResponse.transaction_hash);

        return deployResponse.contract_address;
    }

    async deployInvoiceRegistry(wbtcAddress) {
        const contractName = 'bitflow_contracts_InvoiceRegistry';
        const sierraPath = path.join(this.contractsDir, `${contractName}.contract_class.json`);
        const casmPath = path.join(this.contractsDir, `${contractName}.compiled_contract_class.json`);

        const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));
        const casm = JSON.parse(fs.readFileSync(casmPath, 'utf8'));

        console.log('  📦 Declaring contract...');

        const declareResponse = await this.account.declareIfNot({
            contract: sierra,
            casm: casm,
        });

        if (declareResponse.transaction_hash) {
            console.log(`  ⏳ Waiting for declaration: ${declareResponse.transaction_hash}`);
            await this.provider.waitForTransaction(declareResponse.transaction_hash);
        }

        const classHash = declareResponse.class_hash;
        console.log(`  ✅ Class hash: ${classHash}`);

        // Constructor: wbtc_token, escrow_contract (temporary 0), owner
        const constructorCalldata = starknet.CallData.compile({
            wbtc_token_address: wbtcAddress,
            escrow_contract_address: '0x0',
            owner_address: this.account.address,
        });

        console.log('  🚀 Deploying contract...');

        const deployResponse = await this.account.deployContract({
            classHash,
            constructorCalldata,
        });

        console.log(`  ⏳ Waiting for deployment: ${deployResponse.transaction_hash}`);
        await this.provider.waitForTransaction(deployResponse.transaction_hash);

        return deployResponse.contract_address;
    }

    async deployEscrow(wbtcAddress, invoiceRegistryAddress) {
        const contractName = 'bitflow_contracts_Escrow';
        const sierraPath = path.join(this.contractsDir, `${contractName}.contract_class.json`);
        const casmPath = path.join(this.contractsDir, `${contractName}.compiled_contract_class.json`);

        const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));
        const casm = JSON.parse(fs.readFileSync(casmPath, 'utf8'));

        console.log('  📦 Declaring contract...');

        const declareResponse = await this.account.declareIfNot({
            contract: sierra,
            casm: casm,
        });

        if (declareResponse.transaction_hash) {
            console.log(`  ⏳ Waiting for declaration: ${declareResponse.transaction_hash}`);
            await this.provider.waitForTransaction(declareResponse.transaction_hash);
        }

        const classHash = declareResponse.class_hash;
        console.log(`  ✅ Class hash: ${classHash}`);

        // Constructor: wbtc_token, invoice_registry, owner
        const constructorCalldata = starknet.CallData.compile({
            wbtc_token_address: wbtcAddress,
            invoice_registry_address: invoiceRegistryAddress,
            owner_address: this.account.address,
        });

        console.log('  🚀 Deploying contract...');

        const deployResponse = await this.account.deployContract({
            classHash,
            constructorCalldata,
        });

        console.log(`  ⏳ Waiting for deployment: ${deployResponse.transaction_hash}`);
        await this.provider.waitForTransaction(deployResponse.transaction_hash);

        return deployResponse.contract_address;
    }

    async linkEscrow(invoiceRegistryAddress, escrowAddress) {
        // Get the InvoiceRegistry ABI
        const contractName = 'bitflow_contracts_InvoiceRegistry';
        const sierraPath = path.join(this.contractsDir, `${contractName}.contract_class.json`);
        const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));

        const contract = new starknet.Contract(
            sierra.abi,
            invoiceRegistryAddress,
            this.provider
        );
        contract.connect(this.account);

        console.log('  🔗 Calling set_escrow_address...');

        const call = contract.populate('set_escrow_address', {
            escrow_address: escrowAddress,
        });

        const tx = await this.account.execute(call);
        console.log(`  ⏳ Waiting for transaction: ${tx.transaction_hash}`);
        await this.provider.waitForTransaction(tx.transaction_hash);
    }

    async updateEnvironment(wbtcAddress, invoiceRegistryAddress, escrowAddress) {
        console.log('\n📝 Updating .env file...');

        let envContent = '';
        const envPath = path.join(__dirname, '../.env');

        // Read existing .env
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Update or add contract addresses
        const updateOrAdd = (content, key, value) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(content)) {
                return content.replace(regex, `${key}=${value}`);
            } else {
                return content + `\n${key}=${value}`;
            }
        };

        envContent = updateOrAdd(envContent, 'WBTC_TOKEN_ADDRESS', wbtcAddress);
        envContent = updateOrAdd(envContent, 'INVOICE_REGISTRY_ADDRESS', invoiceRegistryAddress);
        envContent = updateOrAdd(envContent, 'ESCROW_CONTRACT_ADDRESS', escrowAddress);

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Environment file updated');
    }
}

// Run deployment if called directly
if (require.main === module) {
    const deployer = new ScarbDeployer();
    deployer.deployAll()
        .then(() => {
            console.log('✅ Deployment script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Deployment script failed:', error);
            process.exit(1);
        });
}

module.exports = ScarbDeployer;
