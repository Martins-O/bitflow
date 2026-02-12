const fs = require('fs');
const path = require('path');
const { Account, RpcProvider, Contract, json, CallData } = require('starknet');
require('dotenv').config();

class ContractDeployer {
    constructor() {
        this.provider = null;
        this.account = null;
        this.contractsDir = path.join(__dirname, '../contracts/target/dev');
    }

    async initialize() {
        console.log('🔧 Initializing deployer...');

        // Initialize provider
        this.provider = new RpcProvider({
            nodeUrl: process.env.RPC_URL || 'https://starknet-sepolia.infura.io/v3/525ebdb74cd1492ba8b114a26d233a45'
        });

        // Initialize account
        if (!process.env.PRIVATE_KEY || !process.env.ACCOUNT_ADDRESS) {
            throw new Error('Please set PRIVATE_KEY and ACCOUNT_ADDRESS in .env file');
        }

        this.account = new Account(
            this.provider,
            process.env.ACCOUNT_ADDRESS,
            process.env.PRIVATE_KEY
        );

        console.log('✅ Account initialized:', this.account.address);
    }

    loadContract(contractName) {
        const sierraPath = path.join(this.contractsDir, `bitflow_contracts_${contractName}.contract_class.json`);
        const casmPath = path.join(this.contractsDir, `bitflow_contracts_${contractName}.compiled_contract_class.json`);

        if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
            throw new Error(`Contract files not found for ${contractName}. Run 'scarb build' first.`);
        }

        const sierra = json.parse(fs.readFileSync(sierraPath).toString('ascii'));
        const casm = json.parse(fs.readFileSync(casmPath).toString('ascii'));

        return { sierra, casm };
    }

    async deployContract(contractName, constructorCalldata) {
        console.log(`\n📄 Deploying ${contractName}...`);

        const { sierra, casm } = this.loadContract(contractName);

        // Declare contract
        console.log(`  ⏳ Declaring ${contractName}...`);
        const declareResponse = await this.account.declare({
            contract: sierra,
            casm: casm
        });

        await this.provider.waitForTransaction(declareResponse.transaction_hash);
        console.log(`  ✅ Declared with class hash: ${declareResponse.class_hash}`);

        // Deploy contract
        console.log(`  ⏳ Deploying ${contractName}...`);
        const deployResponse = await this.account.deployContract({
            classHash: declareResponse.class_hash,
            constructorCalldata: constructorCalldata
        });

        await this.provider.waitForTransaction(deployResponse.transaction_hash);
        console.log(`  ✅ Deployed at: ${deployResponse.contract_address}`);

        return deployResponse.contract_address;
    }

    async deployAll() {
        console.log('🚀 Deploying BitFlow Contracts');
        console.log('===============================\n');

        try {
            await this.initialize();

            // Deploy WrappedBTC
            const wbtcCalldata = CallData.compile({
                owner: this.account.address
            });
            const wbtcAddress = await this.deployContract('WrappedBTC', wbtcCalldata);

            // Deploy InvoiceRegistry with zero escrow address
            const invoiceRegistryCalldata = CallData.compile({
                wbtc_token_address: wbtcAddress,
                escrow_contract_address: '0x0',
                owner_address: this.account.address
            });
            const invoiceRegistryAddress = await this.deployContract('InvoiceRegistry', invoiceRegistryCalldata);

            // Deploy Escrow
            const escrowCalldata = CallData.compile({
                wbtc_token_address: wbtcAddress,
                invoice_registry_address: invoiceRegistryAddress,
                owner_address: this.account.address
            });
            const escrowAddress = await this.deployContract('Escrow', escrowCalldata);

            // Link Escrow to InvoiceRegistry
            console.log('\n🔗 Linking Escrow to InvoiceRegistry...');
            await this.setEscrowAddress(invoiceRegistryAddress, escrowAddress);

            // Update .env file
            await this.updateEnvironment(wbtcAddress, invoiceRegistryAddress, escrowAddress);

            console.log('\n🎉 All contracts deployed successfully!');
            console.log('\n📋 Deployment Summary:');
            console.log(`  WrappedBTC:       ${wbtcAddress}`);
            console.log(`  InvoiceRegistry:  ${invoiceRegistryAddress}`);
            console.log(`  Escrow:           ${escrowAddress}`);
            console.log('\n✅ Please restart the backend service to use the new contracts.');

        } catch (error) {
            console.error('\n❌ Deployment failed:', error.message);
            if (error.stack) {
                console.error(error.stack);
            }
            throw error;
        }
    }

    async setEscrowAddress(invoiceRegistryAddress, escrowAddress) {
        const { sierra } = this.loadContract('InvoiceRegistry');

        const contract = new Contract(sierra.abi, invoiceRegistryAddress, this.provider);
        contract.connect(this.account);

        const calldata = CallData.compile({
            escrow_address: escrowAddress
        });

        const tx = await contract.set_escrow_address(calldata);
        console.log(`  ⏳ Waiting for set_escrow_address transaction: ${tx.transaction_hash}`);
        await this.provider.waitForTransaction(tx.transaction_hash);
        console.log('  ✅ InvoiceRegistry linked to Escrow');
    }

    async updateEnvironment(wbtcAddress, invoiceRegistryAddress, escrowAddress) {
        console.log('\n📝 Updating environment variables...');

        let envContent = '';

        // Read existing .env or create new one
        if (fs.existsSync('.env')) {
            envContent = fs.readFileSync('.env', 'utf8');
        } else if (fs.existsSync('.env.example')) {
            envContent = fs.readFileSync('.env.example', 'utf8');
        }

        // Update contract addresses
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

        // Write updated content
        fs.writeFileSync('.env', envContent);

        console.log('✅ Environment updated successfully');
    }
}

// Deploy contracts if called directly
if (require.main === module) {
    const deployer = new ContractDeployer();
    deployer.deployAll().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = ContractDeployer;
