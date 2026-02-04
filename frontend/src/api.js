import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Add request interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            error => {
                console.error('API Error:', error);
                throw new Error(error.response?.data?.message || error.message || 'API request failed');
            }
        );
    }

    async createInvoice(invoiceData) {
        try {
            const response = await this.client.post('/invoices/create', {
                amount: invoiceData.amount.toString(),
                description: invoiceData.description,
                escrowEnabled: invoiceData.escrowEnabled || false,
                expiryTimestamp: this.calculateExpiryTimestamp(invoiceData.expiryHours || 48)
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create invoice: ${error.message}`);
        }
    }

    async payInvoice(invoiceId, useEscrow = false) {
        try {
            const response = await this.client.post('/invoices/pay', {
                invoiceId: invoiceId.toString(),
                useEscrow: useEscrow
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to pay invoice: ${error.message}`);
        }
    }

    async releaseEscrow(invoiceId) {
        try {
            const response = await this.client.post('/invoices/release', {
                invoiceId: invoiceId.toString()
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to release escrow: ${error.message}`);
        }
    }

    async getInvoice(invoiceId) {
        try {
            const response = await this.client.get(`/invoices/${invoiceId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get invoice: ${error.message}`);
        }
    }

    async getInvoices(filter = {}) {
        try {
            const params = new URLSearchParams();
            if (filter.address) params.append('address', filter.address);
            if (filter.status) params.append('status', filter.status);
            
            const response = await this.client.get(`/invoices?${params.toString()}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get invoices: ${error.message}`);
        }
    }

    async getBalance(address) {
        try {
            const response = await this.client.get(`/balance/${address}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    async getHealthStatus() {
        try {
            const response = await this.client.get('/health', { baseURL: 'http://localhost:3000' });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get health status: ${error.message}`);
        }
    }

    calculateExpiryTimestamp(hours) {
        const now = Math.floor(Date.now() / 1000);
        return now + (hours * 3600);
    }

    formatAmount(amount, decimals = 8) {
        const num = parseFloat(amount);
        return num.toFixed(decimals).replace(/\.?0+$/, '');
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp * 1000).toLocaleString();
    }

    getStatusColor(status) {
        const colors = {
            'Pending': '#856404',
            'Paid': '#155724',
            'Released': '#0c5460',
            'Expired': '#721c24'
        };
        return colors[status] || '#333';
    }
}

export default ApiService;