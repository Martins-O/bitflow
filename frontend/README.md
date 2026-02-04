# BitFlow Frontend

A modern, responsive web interface for the BitFlow Starknet Bitcoin Payment System.

## Features

- **Wallet Connection**: Connect Starknet wallets (Argent, Braavos)
- **Invoice Creation**: Create invoices with optional escrow protection
- **Invoice Payment**: Pay invoices directly or through escrow
- **Status Tracking**: Track invoice status in real-time
- **Dashboard**: View and manage all your invoices
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites
- Node.js 16+
- Starknet wallet (Argent, Braavos, or compatible)
- Backend server running on port 3000

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

### Production Build

```bash
npm run build
npm run preview
```

## Environment Variables

Create a `.env` file in the frontend directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api

# Starknet Configuration
VITE_STARKNET_NETWORK=testnet
VITE_RPC_URL=https://starknet-testnet.infura.io/v3/YOUR_INFURA_KEY
```

## Usage

### 1. Connect Wallet
- Click "Connect Wallet" in the top navigation
- Select your preferred Starknet wallet
- Approve the connection request

### 2. Create Invoice
- Navigate to the "Create Invoice" section
- Fill in the required details:
  - Amount in BTC
  - Description
  - Expiry time (hours)
  - Enable escrow (optional)
- Click "Create Invoice"

### 3. Pay Invoice
- Navigate to the "Pay Invoice" section
- Enter the invoice ID
- Choose whether to use escrow
- Click "Pay Invoice"

### 4. Track Invoice
- Navigate to the "Track Invoice" section
- Enter the invoice ID
- Click "Check Status"

### 5. Dashboard
- View all your invoices in the dashboard
- Filter by created/paid invoices
- Release escrow when applicable

## File Structure

```
frontend/
├── public/
│   └── index.html          # Main HTML file
├── src/
│   ├── api.js              # API service
│   ├── wallet.js           # Wallet service
│   └── index.js            # Main application
├── styles/
│   └── main.css            # Stylesheet
├── package.json            # Dependencies
└── vite.config.js          # Vite configuration
```

## API Integration

The frontend communicates with the backend API using the following endpoints:

- `POST /api/invoices/create` - Create new invoice
- `POST /api/invoices/pay` - Pay existing invoice
- `POST /api/invoices/release` - Release escrow
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices` - List invoices
- `GET /api/balance/:address` - Get wallet balance

## Wallet Support

The frontend supports:
- **Argent X** - Most popular Starknet wallet
- **Braavos** - Modern mobile-first wallet
- **Other compatible wallets** - Any wallet implementing the Starknet interface

## Styling

The application uses:
- **CSS Grid & Flexbox** - Modern layout
- **CSS Variables** - Consistent theming
- **Responsive Design** - Mobile-first approach
- **Gradient Backgrounds** - Modern aesthetics
- **Smooth Animations** - Enhanced UX

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security

- All wallet operations require user approval
- No private keys are stored in the frontend
- Secure HTTPS communication (in production)
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details