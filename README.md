# BitFlow - Starknet BTC Payment System

A comprehensive Bitcoin payment system built on Starknet, featuring smart contracts for invoice management and escrow functionality.

## 🏗️ Architecture

### Smart Contracts (Cairo)
- **WrappedBTC.cairo** - ERC20-like wrapped Bitcoin token
- **InvoiceRegistry.cairo** - Invoice creation and management
- **Escrow.cairo** - Secure escrow functionality

### Backend Service (Node.js)
- REST API for invoice operations
- Contract interaction layer
- Event tracking and status management

### Scripts & Tools
- Deployment automation
- CLI interface for testing
- Demo scripts showcasing full lifecycle

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Starknet account with testnet ETH
- Python 3.8+ (for Cairo compilation)

### Installation

1. **Clone and setup**
```bash
git clone <repository-url>
cd starknet-btc-payment
npm install
```

2. **Environment configuration**
```bash
cp .env.example .env
# Edit .env with your Starknet account details
```

3. **Deploy contracts**
```bash
npm run deploy
```

4. **Mint test tokens**
```bash
npm run mint-tokens setup
```

5. **Start the service**
```bash
npm start
```

## 📖 Usage

### API Endpoints

#### Create Invoice
```bash
curl -X POST http://localhost:3000/api/invoices/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.1,
    "description": "Web Development Services",
    "escrowEnabled": true,
    "expiryTimestamp": 1640995200
  }'
```

#### Pay Invoice
```bash
curl -X POST http://localhost:3000/api/invoices/pay \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "1",
    "useEscrow": true
  }'
```

#### Release Escrow
```bash
curl -X POST http://localhost:3000/api/invoices/release \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "1"
  }'
```

#### Get Invoice Details
```bash
curl http://localhost:3000/api/invoices/1
```

### CLI Interface

```bash
# Create an invoice
node scripts/cli.js create 0.1 "Consulting Services" true 48

# Pay an invoice
node scripts/cli.js pay 1 true

# Release escrow
node scripts/cli.js release 1

# Check invoice details
node scripts/cli.js details 1

# Check balance
node scripts/cli.js balance 0x123456...
```

### Demo Scripts

```bash
# Run full demo
npm run demo

# This demonstrates:
# 1. Creating direct and escrow invoices
# 2. Paying invoices
# 3. Releasing escrow funds
# 4. Tracking status changes
```

## 🔧 Contract Features

### InvoiceRegistry
- ✅ Invoice creation with custom parameters
- ✅ Status tracking (Pending, Paid, Released, Expired)
- ✅ Event emission for all operations
- ✅ Direct and escrow payment support

### Escrow
- ✅ Secure fund holding
- ✅ Creator-only release mechanism
- ✅ Emergency refund functionality
- ✅ Full audit trail

### WrappedBTC
- ✅ ERC20-standard implementation
- ✅ Mint/burn capabilities
- ✅ Approval mechanisms
- ✅ Transfer and transferFrom

## 📊 System Flow

1. **Invoice Creation**
   - Merchant creates invoice with amount, description, and escrow settings
   - System generates unique invoice ID
   - Invoice stored on-chain with Pending status

2. **Payment Process**
   - Customer approves token transfer
   - If escrow disabled → Direct transfer to merchant
   - If escrow enabled → Tokens locked in escrow contract

3. **Escrow Release**
   - Merchant initiates release (only creator can release)
   - Tokens transferred from escrow to merchant
   - Invoice status updated to Released

## 🛡️ Security Features

- **Access Control**: Only invoice creators can release escrowed funds
- **Event Logging**: All operations emit blockchain events
- **Status Validation**: State transitions are strictly enforced
- **Emergency Controls**: Contract owner can perform emergency operations
- **Input Validation**: All inputs are validated before processing

## 📝 Environment Variables

```bash
# Network Configuration
STARKNET_NETWORK=testnet
RPC_URL=https://starknet-testnet.infura.io/v3/YOUR_INFURA_KEY

# Account Configuration
PRIVATE_KEY=your_private_key
ACCOUNT_ADDRESS=your_account_address

# Contract Addresses (auto-populated after deployment)
WBTC_TOKEN_ADDRESS=0x...
INVOICE_REGISTRY_ADDRESS=0x...
ESCROW_CONTRACT_ADDRESS=0x...
```

## 🧪 Testing

### Manual Testing
```bash
# Start the service
npm start

# Run the CLI demo
npm run demo

# Test individual operations
node scripts/cli.js create 0.01 "Test Invoice"
node scripts/cli.js pay 1 false
node scripts/cli.js details 1
```

### API Testing
```bash
# Health check
curl http://localhost:3000/health

# Create invoice
curl -X POST http://localhost:3000/api/invoices/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 0.01, "description": "Test", "escrowEnabled": false, "expiryTimestamp": 1640995200}'
```

## 📚 Contract Integration

### Contract Addresses
After deployment, contract addresses are automatically saved to your `.env` file:

```
WBTC_TOKEN_ADDRESS=0x1234...
INVOICE_REGISTRY_ADDRESS=0x5678...
ESCROW_CONTRACT_ADDRESS=0x9abc...
```

### Event Monitoring
All contracts emit events for:
- Invoice creation, payment, and status changes
- Escrow deposits, releases, and refunds
- Token transfers and approvals

## 🔍 Development

### Project Structure
```
├── contracts/           # Cairo smart contracts
│   ├── WrappedBTC.cairo
│   ├── InvoiceRegistry.cairo
│   └── Escrow.cairo
├── backend/            # Node.js backend
│   ├── src/
│   │   ├── app.js
│   │   ├── routes/
│   │   └── services/
│   └── routes/
├── scripts/            # Utility scripts
│   ├── deploy.js
│   ├── demo.js
│   ├── cli.js
│   └── mint-tokens.js
├── .env.example
└── README.md
```

### Adding New Features
1. Update smart contracts in `/contracts/`
2. Deploy using `npm run deploy`
3. Update backend service in `/backend/src/`
4. Add new API routes as needed
5. Update CLI tools for testing

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes and test thoroughly
4. Submit pull request with description

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the demo scripts for usage examples
- Review the CLI tool help: `node scripts/cli.js`
- Examine contract events for debugging
- Use health endpoint: `GET /health`

---

**Built with ❤️ for the Starknet ecosystem**