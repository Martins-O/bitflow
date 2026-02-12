const starknet = require('starknet');
require('dotenv').config();

class ContractDeployer {
  constructor() {
    this.provider = null;
    this.account = null;
  }

  async initialize() {
    // Initialize provider
    this.provider = new starknet.RpcProvider({
      nodeUrl: process.env.RPC_URL || 'https://starknet-testnet.infura.io/v3/YOUR_INFURA_KEY'
    });

    // Initialize account
    if (process.env.PRIVATE_KEY && process.env.ACCOUNT_ADDRESS) {
      this.account = new starknet.Account(
        this.provider,
        process.env.ACCOUNT_ADDRESS,
        process.env.PRIVATE_KEY
      );
    } else {
      throw new Error('Please set PRIVATE_KEY and ACCOUNT_ADDRESS in .env file');
    }
  }

  async deployAll() {
    console.log('🚀 Deploying BitFlow Contracts');
    console.log('===============================\n');

    try {
      await this.initialize();

      // Deploy WrappedBTC
      const wbtcAddress = await this.deployWrappedBTC();
      console.log('✅ WrappedBTC deployed at:', wbtcAddress);

      // Deploy InvoiceRegistry (first without escrow address)
      let invoiceRegistryAddress = await this.deployInvoiceRegistry(wbtcAddress);
      console.log('✅ InvoiceRegistry deployed at:', invoiceRegistryAddress);

      // Deploy Escrow
      const escrowAddress = await this.deployEscrow(wbtcAddress, invoiceRegistryAddress);
      console.log('✅ Escrow deployed at:', escrowAddress);

      // Link Escrow to InvoiceRegistry
      console.log('🔗 Linking Escrow to InvoiceRegistry...');
      await this.setEscrowAddress(invoiceRegistryAddress, escrowAddress);
      console.log('✅ InvoiceRegistry linked to Escrow');

      // Update .env file with final addresses
      await this.updateEnvironment(wbtcAddress, invoiceRegistryAddress, escrowAddress);

      console.log('\n🎉 All contracts deployed successfully!');
      console.log('Please restart the backend service to use the new contracts.');

    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      throw error;
    }
  }

  async deployWrappedBTC() {
    console.log('📄 Deploying WrappedBTC contract...');

    // Compile and declare the contract
    const { contractFactory } = await starknet.declareIfNot({
      contract: './contracts/WrappedBTC.cairo',
      casm: './contracts/WrappedBTC.casm',
      senderAddress: this.account.address,
    });

    // Deploy the contract
    const constructorCalldata = [
      starknet.shortStringToFelt('Wrapped Bitcoin'),
      starknet.shortStringToFelt('WBTC'),
      18, // decimals
      1000000000000000000000000, // initial supply (1M BTC in wei)
      this.account.address // initial owner
    ];

    const contract = await contractFactory.deploy(constructorCalldata);
    await contract.waitForDeployment();

    return contract.address;
  }

  async deployInvoiceRegistry(wbtcAddress, escrowAddress = null) {
    console.log('📋 Deploying InvoiceRegistry contract...');

    // Compile and declare contract
    const { contractFactory } = await starknet.declareIfNot({
      contract: './contracts/InvoiceRegistry.cairo',
      casm: './contracts/InvoiceRegistry.casm',
      senderAddress: this.account.address,
    });

    // Deploy contract with owner address and optionally escrow address
    const constructorCalldata = escrowAddress
      ? [wbtcAddress, escrowAddress, this.account.address]
      : [wbtcAddress, '0x0', this.account.address]; // Temporary escrow address

    const contract = await contractFactory.deploy(constructorCalldata);
    await contract.waitForDeployment();

    return contract.address;
  }

  async deployEscrow(wbtcAddress, invoiceRegistryAddress) {
    console.log('🔒 Deploying Escrow contract...');

    // Compile and declare contract
    const { contractFactory } = await starknet.declareIfNot({
      contract: './contracts/Escrow.cairo',
      casm: './contracts/Escrow.casm',
      senderAddress: this.account.address,
    });

    // Deploy contract with owner address
    const constructorCalldata = [wbtcAddress, invoiceRegistryAddress, this.account.address];

    const contract = await contractFactory.deploy(constructorCalldata);
    await contract.waitForDeployment();

    return contract.address;
  }

  async updateEnvironment(wbtcAddress, invoiceRegistryAddress, escrowAddress) {
    console.log('📝 Updating environment variables...');

    const fs = require('fs');
    let envContent = '';

    // Read existing .env or create new one
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    } else {
      envContent = fs.readFileSync('.env.example', 'utf8');
    }

    // Update contract addresses
    envContent = envContent.replace(/WBTC_TOKEN_ADDRESS=.*/g, `WBTC_TOKEN_ADDRESS=${wbtcAddress}`);
    envContent = envContent.replace(/INVOICE_REGISTRY_ADDRESS=.*/g, `INVOICE_REGISTRY_ADDRESS=${invoiceRegistryAddress}`);
    envContent = envContent.replace(/ESCROW_CONTRACT_ADDRESS=.*/g, `ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);

    // Write updated content
    fs.writeFileSync('.env', envContent);

    console.log('✅ Environment updated successfully');
  }

  async setEscrowAddress(invoiceRegistryAddress, escrowAddress) {
    const { contractFactory } = await starknet.declareIfNot({
      contract: './contracts/InvoiceRegistry.cairo',
      casm: './contracts/InvoiceRegistry.casm',
      senderAddress: this.account.address,
    });

    const contract = new starknet.Contract(contractFactory.abi, invoiceRegistryAddress, this.provider);
    contract.connect(this.account);

    const call = contract.populate('set_escrow_address', [escrowAddress]);
    const tx = await this.account.execute(call);

    console.log('⏳ Waiting for set_escrow_address transaction:', tx.transaction_hash);
    await this.provider.waitForTransaction(tx.transaction_hash);
  }
}

// Deploy contracts if called directly
if (require.main === module) {
  const deployer = new ContractDeployer();
  deployer.deployAll().catch(console.error);
}

module.exports = ContractDeployer;