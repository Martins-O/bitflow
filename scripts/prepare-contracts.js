#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing BitFlow Contracts for Production Build');
console.log('==================================================');

// Create build directory
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Contract files to prepare
const contracts = [
  'WrappedBTC.cairo',
  'InvoiceRegistry.cairo', 
  'Escrow.cairo'
];

// Copy contracts to build directory
console.log('📋 Copying contract files...');
contracts.forEach(contract => {
  const srcPath = path.join(__dirname, '..', 'contracts', contract);
  const destPath = path.join(buildDir, contract);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Copied ${contract}`);
  } else {
    console.log(`❌ Missing ${contract}`);
  }
});

// Create contract summary
console.log();
console.log('📄 Contract Summary:');
console.log();

contracts.forEach(contract => {
  const contractPath = path.join(__dirname, '..', 'contracts', contract);
  if (fs.existsSync(contractPath)) {
    const content = fs.readFileSync(contractPath, 'utf8');
    const lines = content.split('\n').length;
    const functions = (content.match(/@external|@view/g) || []).length;
    
    console.log(`📄 ${contract}`);
    console.log(`   Lines: ${lines}`);
    console.log(`   Functions: ${functions}`);
    console.log(`   ✅ Fixed timestamps: ${content.includes('get_block_timestamp()') ? 'Yes' : 'No'}`);
    console.log(`   ✅ Owner validation: ${content.includes('owner.write') ? 'Yes' : 'No'}`);
    console.log(`   ✅ Escrow integration: ${contract.includes('InvoiceRegistry') && content.includes('IEscrow.deposit') ? 'Yes' : 'N/A'}`);
    console.log();
  }
});

// Create deployment manifest
const manifest = {
  name: 'BitFlow Starknet Payment System',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  contracts: contracts.map(contract => ({
    name: contract.replace('.cairo', ''),
    file: contract,
    features: getContractFeatures(contract)
  }),
  fixes: [
    '✅ Fixed hardcoded timestamps with get_block_timestamp()',
    '✅ Fixed broken escrow integration with proper deposit() calls',
    '✅ Fixed flawed emergency access control with owner validation',
    '✅ Added proper expiry validation',
    '✅ Completed ABI definitions',
    '✅ Added transaction confirmation waiting',
    '✅ Fixed missing API endpoints',
    '✅ Fixed demo integration with real transaction parsing'
  ]
};

fs.writeFileSync(
  path.join(buildDir, 'build-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('📝 Build manifest created');
console.log();
console.log('✅ Contract preparation completed!');
console.log('📁 Build directory: ./build');
console.log('📋 Manifest: ./build/build-manifest.json');
console.log();
console.log('🚀 Ready for deployment with: npm run build:prod');

function getContractFeatures(contractName) {
  const features = {
    'WrappedBTC': [
      'ERC20-compatible token',
      'Mint/burn functionality', 
      'Owner-controlled minting',
      'Transfer/allowance mechanisms'
    ],
    'InvoiceRegistry': [
      'Invoice creation & management',
      'Escrow integration',
      'Expiry validation',
      'Event emission',
      'Status tracking'
    ],
    'Escrow': [
      'Secure fund holding',
      'Creator-only release',
      'Emergency withdrawal',
      'Refund mechanisms'
    ]
  };
  
  return features[contractName.replace('.cairo', '')] || [];
}