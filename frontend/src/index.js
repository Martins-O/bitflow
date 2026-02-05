import ApiService from './api.js';
import WalletService from './wallet.js';

class BitFlowApp {
    constructor() {
        this.api = new ApiService();
        this.wallet = new WalletService();
        this.currentInvoice = null;
        this.refreshInterval = null;
        this.isOffline = !navigator.onLine;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkWalletConnection();
        this.loadDashboard();
        this.initializeProgressiveEnhancements();
        this.setupOfflineDetection();
        this.initializeKeyboardShortcuts();
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
        
        // Enhanced interactions
        this.setupRippleEffects();
        this.setupFloatingLabels();
        
        // Custom events
        window.addEventListener('walletDisconnected', () => this.handleWalletDisconnected());
        window.addEventListener('accountChanged', (e) => this.handleAccountChanged(e));
        
        // Navigation smooth scroll with performance optimization
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    this.smoothScrollTo(target);
                }
            });
        });

        // Visibility change for tab switching
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.wallet.connected) {
                this.loadDashboard();
            }
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
        } finally {
            button.classList.remove('loading');
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

    checkWalletConnection() {
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
            button.innerHTML = '<span class="btn-icon">🔗</span> Disconnect';
            button.classList.remove('btn-primary');
            button.classList.add('btn-secondary');
            
            address.textContent = this.wallet.formatAddress(walletInfo.address);
            indicator.classList.remove('disconnected');
            indicator.classList.add('connected');
        } else {
            button.innerHTML = '<span class="btn-icon">🔗</span> Connect Wallet';
            button.classList.remove('btn-secondary');
            button.classList.add('btn-primary');
            
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
            
            let message = useEscrow 
                ? `Invoice paid with escrow! Transaction: ${result.transactionHash}` 
                : `Invoice paid successfully! Transaction: ${result.transactionHash}`;
            
            this.showResult('pay-result', message, 'success');
            e.target.reset();
            this.loadDashboard();
            
            // Update this invoice in the UI with animation
            if (invoice) {
                this.animateInvoiceUpdate(invoiceId);
            }
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
            const invoiceId = formData.get('trackInvoiceId');
            
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

        const invoicesHTML = invoices.map((invoice, index) => this.createInvoiceItem(invoice, index)).join('');
        container.innerHTML = invoicesHTML;
        
        // Animate in new invoices
        this.animateInvoices();
    }

    createInvoiceItem(invoice, index) {
        const statusClass = this.getStatusClass(invoice.status);
        const amountFormatted = this.api.formatAmount(invoice.amount);
        const expiryFormatted = this.api.formatTimestamp(invoice.expiryTimestamp);
        
        const escrowButton = invoice.status === 'PAID' && invoice.escrowEnabled 
            ? `<button class="btn btn-success btn-sm hover-lift" onclick="app.releaseEscrow('${invoice.id}')">
                    <span>Release Escrow</span>
                </button>`
            : '';

        return `
            <div class="invoice-item fade-in" style="animation-delay: ${index * 100}ms">
                <div class="invoice-card card">
                    <div class="invoice-header">
                        <span class="invoice-id">#${invoice.id}</span>
                        <span class="badge badge-${statusClass}">${invoice.status}</span>
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
                        ${invoice.escrowEnabled ? '<div class="invoice-detail"><strong>Escrow:</strong> <span class="badge badge-paid">Enabled</span></div>' : ''}
                    </div>
                    ${escrowButton}
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        const statusMap = {
            'PENDING': 'pending',
            'PAID': 'paid',
            'RELEASED': 'leased',
            'EXPIRED': 'expured'
        };
        return statusMap[status.toLowerCase()] || 'pending';
    }

    displayInvoiceDetails(containerId, invoice) {
        const container = document.getElementById(containerId);
        const amountFormatted = this.api.formatAmount(invoice.amount);
        
        const details = `
            <div class="invoice-details card">
                <h4>Invoice Details</h4>
                <div class="invoice-detail">
                    <strong>ID:</strong> ${invoice.id}
                </div>
                <div class="invoice-detail">
                    <strong>Amount:</strong> ${amountFormatted} BTC
                </div>
                <div class="invoice-detail">
                    <strong>Status:</strong> <span class="badge badge-${this.getStatusClass(invoice.status)}">${invoice.status}</span>
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
        container.classList.add('fade-in');
    }

    displayNoInvoices() {
        const container = document.getElementById('invoice-list');
        container.innerHTML = '<div class="no-invoices"><div class="loading-skeleton"></div><p>No invoices found</p></div>';
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
        container.className = `result result-${type}`;
        container.classList.remove('hidden');
        container.classList.add('fade-in');
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            container.classList.add('hidden');
        }, 8000);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        const closeBtn = document.getElementById('notification-close');
        
        messageElement.textContent = message;
        notification.className = `notification notification-${type}`;
        closeBtn.innerHTML = '×';
        
        // Show notification
        notification.classList.remove('hidden');
        notification.classList.add('slideInLeft');
        
        // Auto-hide after 6 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 6000);
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        notification.classList.add('slideOutRight');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    // Progressive Enhancement Methods
    initializeProgressiveEnhancements() {
        // Intersection Observer for animations
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        }
        
        // Service Worker for caching
        if ('serviceWorker' in navigator) {
            this.setupServiceWorker();
        }
        
        // Performance monitoring
        if ('PerformanceObserver' in window) {
            this.setupPerformanceObserver();
        }
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.invoice-item').forEach(item => {
            observer.observe(item);
        });
    }

    setupServiceWorker() {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    }

    setupPerformanceObserver() {
        const observer = new PerformanceObserver((list) => {
            const perfData = list.getEntries()[0];
            console.log('Page Performance:', perfData);
        });
        
        observer.observe({ entryTypes: ['navigation'] });
    }

    setupRippleEffects() {
        document.querySelectorAll('.ripple-effect').forEach(button => {
            button.addEventListener('click', (e) => {
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                
                button.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }

    setupFloatingLabels() {
        document.querySelectorAll('.floating-label').forEach(group => {
            const input = group.querySelector('.form-control');
            const label = group.querySelector('label');
            
            if (input && label) {
                input.addEventListener('focus', () => {
                    label.classList.add('focused');
                });
                
                input.addEventListener('blur', () => {
                    label.classList.remove('focused');
                });
            }
        });
    }

    animateInvoiceUpdate(invoiceId) {
        const invoiceItem = document.querySelector(`[data-invoice-id="${invoiceId}"]`);
        if (invoiceItem) {
            invoiceItem.classList.add('pulse-once');
            setTimeout(() => {
                invoiceItem.classList.remove('pulse-once');
            }, 1000);
        }
    }

    smoothScrollTo(element) {
        const headerOffset = document.querySelector('.page-header').offsetHeight;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - headerOffset - 20;
        
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.showNotification('Connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOffline = true;
            this.showNotification('Offline mode - Some features may be limited', 'error');
        });
    }

    initializeKeyboardShortcuts() {
        const shortcuts = {
            'Ctrl+N': () => this.quickCreateInvoice(),
            'Ctrl+P': () => this.quickPayInvoice(),
            'Ctrl+R': () => this.quickRefresh(),
            'Escape': () => this.hideAllNotifications()
        };

        document.addEventListener('keydown', (e) => {
            const key = Object.keys(shortcuts).find(k => e.ctrlKey && e.key === k);
            if (key && shortcuts[key]) {
                e.preventDefault();
                shortcuts[key]();
            }
        });
    }

    quickCreateInvoice() {
        const amount = prompt('Enter amount (BTC):');
        const description = prompt('Enter description:');
        
        if (amount && description) {
            this.api.createInvoice({
                amount: parseFloat(amount),
                description,
                escrowEnabled: false,
                expiryHours: 24
            }).then(() => {
                this.showNotification('Quick invoice created!', 'success');
                this.loadDashboard();
            }).catch(error => {
                    this.showNotification(error.message, 'error');
                });
        }
    }

    quickPayInvoice() {
        const invoiceId = prompt('Enter invoice ID:');
        
        if (invoiceId) {
            this.api.payInvoice(invoiceId, false).then(() => {
                this.showNotification('Quick payment completed!', 'success');
                this.loadDashboard();
            }).catch(error => {
                    this.showNotification(error.message, 'error');
                });
        }
    }

    quickRefresh() {
        this.showNotification('Refreshing dashboard...', 'info');
        this.loadDashboard();
    }

    hideAllNotifications() {
        document.getElementById('notification').classList.add('hidden');
        this.hideResult('create-result');
        this.hideResult('pay-result');
        this.hideResult('track-result');
    }

    handleWalletDisconnected() {
        this.updateWalletUI(false);
        this.showNotification('Wallet disconnected', 'info');
        this.displayNoInvoices();
    }

    handleAccountChanged(e) {
        this.updateWalletUI(true, e.detail);
        this.showNotification('Account switched', 'info');
        this.loadDashboard();
    }

    animateInvoices() {
        const invoices = document.querySelectorAll('.invoice-item');
        invoices.forEach((invoice, index) => {
            setTimeout(() => {
                invoice.classList.add('fade-in');
            }, index * 100);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BitFlowApp();
});