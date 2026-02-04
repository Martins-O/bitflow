import ApiService from './api.js';
import WalletService from './wallet.js';

class BitFlowApp {
    constructor() {
        this.api = new ApiService();
        this.wallet = new WalletService();
        this.currentInvoice = null;
        this.refreshInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkWalletConnection();
        this.loadDashboard();
    }

    setupEventListeners() {
        // Wallet connection
        document.getElementById('wallet-connect').addEventListener('click', () => this.toggleWallet());
        
        // Form submissions
        document.getElementById('create-invoice-form').addEventListener('submit', (e) => this.handleCreateInvoice(e));
        document.getElementById('pay-invoice-form').addEventListener('submit', (e) => this.handlePayInvoice(e));
        document.getElementById('track-invoice-form').addEventListener('submit', (e) => this.handleTrackInvoice(e));
        
        // Dashboard
        document.getElementById('refresh-dashboard').addEventListener('click', () => this.loadDashboard());
        document.getElementById('address-filter').addEventListener('change', () => this.loadDashboard());
        
        // Notification
        document.getElementById('notification-close').addEventListener('click', () => this.hideNotification());
        
        // Custom events
        window.addEventListener('walletDisconnected', () => this.handleWalletDisconnected());
        window.addEventListener('accountChanged', (e) => this.handleAccountChanged(e));
        
        // Navigation smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    async toggleWallet() {
        const button = document.getElementById('wallet-connect');
        
        try {
            if (this.wallet.connected) {
                await this.wallet.disconnect();
                this.updateWalletUI(false);
                this.showNotification('Wallet disconnected', 'info');
            } else {
                await this.connectWallet();
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async connectWallet() {
        this.showLoading(true);
        
        try {
            const result = await this.wallet.connect();
            this.updateWalletUI(true, result);
            this.showNotification('Wallet connected successfully', 'success');
            this.loadDashboard();
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async checkWalletConnection() {
        try {
            const isConnected = await this.wallet.isConnected();
            if (isConnected) {
                await this.connectWallet();
            }
        } catch (error) {
            console.log('No wallet connected on load');
        }
    }

    updateWalletUI(connected, walletInfo = {}) {
        const button = document.getElementById('wallet-connect');
        const status = document.getElementById('wallet-status');
        const address = document.getElementById('wallet-address');
        const indicator = status.querySelector('.status-indicator');
        
        if (connected) {
            button.textContent = 'Disconnect';
            address.textContent = this.wallet.formatAddress(walletInfo.address);
            indicator.classList.remove('disconnected');
            indicator.classList.add('connected');
        } else {
            button.textContent = 'Connect Wallet';
            address.textContent = 'Wallet not connected';
            indicator.classList.remove('connected');
            indicator.classList.add('disconnected');
        }
    }

    async handleCreateInvoice(e) {
        e.preventDefault();
        
        if (!this.wallet.connected) {
            this.showNotification('Please connect your wallet first', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            const formData = new FormData(e.target);
            const invoiceData = {
                amount: parseFloat(formData.get('amount')),
                description: formData.get('description'),
                expiryHours: parseInt(formData.get('expiry')),
                escrowEnabled: formData.get('escrowEnabled') === 'on'
            };

            const result = await this.api.createInvoice(invoiceData);
            this.showResult('create-result', `Invoice created successfully! ID: ${result.invoiceId}`, 'success');
            e.target.reset();
            this.loadDashboard();
        } catch (error) {
            this.showResult('create-result', error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handlePayInvoice(e) {
        e.preventDefault();
        
        if (!this.wallet.connected) {
            this.showNotification('Please connect your wallet first', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            const formData = new FormData(e.target);
            const invoiceId = formData.get('invoiceId');
            const useEscrow = formData.get('useEscrow') === 'on';

            // First get invoice details to check if it exists and get the amount
            const invoice = await this.api.getInvoice(invoiceId);
            
            // Pay the invoice
            const result = await this.api.payInvoice(invoiceId, useEscrow);
            this.showResult('pay-result', `Invoice paid successfully! Transaction: ${result.transactionHash}`, 'success');
            e.target.reset();
            this.loadDashboard();
        } catch (error) {
            this.showResult('pay-result', error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleTrackInvoice(e) {
        e.preventDefault();
        
        this.showLoading(true);
        
        try {
            const formData = new FormData(e.target);
            const invoiceId = formData.get('invoiceId');
            
            const invoice = await this.api.getInvoice(invoiceId);
            this.displayInvoiceDetails('track-result', invoice);
        } catch (error) {
            this.showResult('track-result', error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadDashboard() {
        if (!this.wallet.connected) {
            this.displayNoInvoices();
            return;
        }

        try {
            const filter = this.getFilterOptions();
            const invoices = await this.api.getInvoices(filter);
            this.displayInvoices(invoices);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.displayNoInvoices();
        }
    }

    getFilterOptions() {
        const filterValue = document.getElementById('address-filter').value;
        const filter = {};
        
        if (filterValue && this.wallet.address) {
            filter.address = this.wallet.address;
            filter.type = filterValue;
        }
        
        return filter;
    }

    displayInvoices(invoices) {
        const container = document.getElementById('invoice-list');
        
        if (!invoices || invoices.length === 0) {
            this.displayNoInvoices();
            return;
        }

        const invoicesHTML = invoices.map(invoice => this.createInvoiceItem(invoice)).join('');
        container.innerHTML = invoicesHTML;
    }

    createInvoiceItem(invoice) {
        const statusClass = `status-${invoice.status.toLowerCase()}`;
        const amountFormatted = this.api.formatAmount(invoice.amount);
        const expiryFormatted = this.api.formatTimestamp(invoice.expiryTimestamp);
        
        return `
            <div class="invoice-item">
                <div class="invoice-header">
                    <span class="invoice-id">#${invoice.id}</span>
                    <span class="invoice-status ${statusClass}">${invoice.status}</span>
                </div>
                <div class="invoice-details">
                    <div class="invoice-detail">
                        <strong>Amount:</strong> ${amountFormatted} BTC
                    </div>
                    <div class="invoice-detail">
                        <strong>Description:</strong> ${invoice.description}
                    </div>
                    <div class="invoice-detail">
                        <strong>Created:</strong> ${this.api.formatTimestamp(invoice.createdAt)}
                    </div>
                    <div class="invoice-detail">
                        <strong>Expires:</strong> ${expiryFormatted}
                    </div>
                    ${invoice.escrowEnabled ? '<div class="invoice-detail"><strong>Escrow:</strong> Enabled</div>' : ''}
                </div>
                ${invoice.status === 'Paid' && invoice.escrowEnabled ? `
                    <button class="btn btn-success mt-2" onclick="app.releaseEscrow('${invoice.id}')">
                        Release Escrow
                    </button>
                ` : ''}
            </div>
        `;
    }

    displayInvoiceDetails(containerId, invoice) {
        const container = document.getElementById(containerId);
        const amountFormatted = this.api.formatAmount(invoice.amount);
        
        const details = `
            <div class="invoice-details">
                <h4>Invoice Details</h4>
                <div class="invoice-detail">
                    <strong>ID:</strong> ${invoice.id}
                </div>
                <div class="invoice-detail">
                    <strong>Amount:</strong> ${amountFormatted} BTC
                </div>
                <div class="invoice-detail">
                    <strong>Status:</strong> ${invoice.status}
                </div>
                <div class="invoice-detail">
                    <strong>Description:</strong> ${invoice.description}
                </div>
                <div class="invoice-detail">
                    <strong>Created:</strong> ${this.api.formatTimestamp(invoice.createdAt)}
                </div>
                <div class="invoice-detail">
                    <strong>Expires:</strong> ${this.api.formatTimestamp(invoice.expiryTimestamp)}
                </div>
                <div class="invoice-detail">
                    <strong>Escrow Enabled:</strong> ${invoice.escrowEnabled ? 'Yes' : 'No'}
                </div>
                ${invoice.merchantAddress ? `
                    <div class="invoice-detail">
                        <strong>Merchant:</strong> ${this.wallet.formatAddress(invoice.merchantAddress)}
                    </div>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = details;
        container.classList.remove('hidden');
        container.className = 'result success';
    }

    displayNoInvoices() {
        const container = document.getElementById('invoice-list');
        container.innerHTML = '<p class="no-invoices">No invoices found. Connect your wallet to view invoices.</p>';
    }

    async releaseEscrow(invoiceId) {
        if (!this.wallet.connected) {
            this.showNotification('Please connect your wallet first', 'error');
            return;
        }

        if (!confirm('Are you sure you want to release the escrow funds?')) {
            return;
        }

        this.showLoading(true);
        
        try {
            const result = await this.api.releaseEscrow(invoiceId);
            this.showNotification('Escrow released successfully!', 'success');
            this.loadDashboard();
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showResult(containerId, message, type) {
        const container = document.getElementById(containerId);
        container.textContent = message;
        container.className = `result ${type}`;
        container.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        
        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        notification.classList.add('hidden');
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    handleWalletDisconnected() {
        this.updateWalletUI(false);
        this.showNotification('Wallet disconnected', 'info');
        this.displayNoInvoices();
    }

    handleAccountChanged(e) {
        this.updateWalletUI(true, { address: e.detail.address });
        this.showNotification('Account switched', 'info');
        this.loadDashboard();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BitFlowApp();
});