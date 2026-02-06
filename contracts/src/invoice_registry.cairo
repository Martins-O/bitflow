// SPDX-License-Identifier: MIT
// InvoiceRegistry - Invoice Management for BitFlow Payment System
// Cairo 1.0 Implementation

use starknet::ContractAddress;

// Invoice Status Constants
mod InvoiceStatus {
    const PENDING: felt252 = 0;
    const PAID: felt252 = 1;
    const RELEASED: felt252 = 2;
    const EXPIRED: felt252 = 3;
}

#[starknet::interface]
trait IInvoiceRegistry<TContractState> {
    // View functions
    fn get_invoice(self: @TContractState, invoice_id: u256) -> Invoice;
    fn get_next_invoice_id(self: @TContractState) -> u256;
    fn get_wbtc_address(self: @TContractState) -> ContractAddress;
    fn get_escrow_address(self: @TContractState) -> ContractAddress;
    fn get_owner(self: @TContractState) -> ContractAddress;

    // External functions
    fn create_invoice(
        ref self: TContractState,
        amount: u256,
        description: felt252,
        escrow_enabled: bool,
        expiry_timestamp: u64
    ) -> u256;
    fn pay_invoice(ref self: TContractState, invoice_id: u256) -> bool;
    fn pay_invoice_with_escrow(ref self: TContractState, invoice_id: u256) -> bool;
    fn mark_invoice_expired(ref self: TContractState, invoice_id: u256) -> bool;
    fn release_escrow(ref self: TContractState, invoice_id: u256) -> bool;
}

// ERC20 Interface for token transfers
#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
}

// Escrow Interface
#[starknet::interface]
trait IEscrow<TContractState> {
    fn deposit(
        ref self: TContractState,
        invoice_id: u256,
        payer: ContractAddress,
        amount: u256,
        invoice_creator: ContractAddress
    ) -> bool;
    fn release(ref self: TContractState, invoice_id: u256) -> bool;
}

// Invoice struct - must be defined outside the contract module for interface
#[derive(Drop, Serde, starknet::Store)]
struct Invoice {
    id: u256,
    creator: ContractAddress,
    amount: u256,
    description: felt252,
    escrow_enabled: bool,
    expiry_timestamp: u64,
    status: felt252,
    created_at: u64,
    paid_at: u64,
}

#[starknet::contract]
mod InvoiceRegistry {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use core::num::traits::Zero;
    use super::{Invoice, InvoiceStatus, IERC20Dispatcher, IERC20DispatcherTrait};
    use super::{IEscrowDispatcher, IEscrowDispatcherTrait};

    // Storage
    #[storage]
    struct Storage {
        invoices: Map<u256, Invoice>,
        next_invoice_id: u256,
        wbtc_token: ContractAddress,
        escrow_contract: ContractAddress,
        owner: ContractAddress,
        // Reentrancy guard
        locked: bool,
    }

    // Events
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        InvoiceCreated: InvoiceCreated,
        InvoicePaid: InvoicePaid,
        InvoiceStatusUpdated: InvoiceStatusUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct InvoiceCreated {
        #[key]
        id: u256,
        #[key]
        creator: ContractAddress,
        amount: u256,
        description: felt252,
        escrow_enabled: bool,
        expiry_timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct InvoicePaid {
        #[key]
        id: u256,
        #[key]
        payer: ContractAddress,
        amount: u256,
        escrow_enabled: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct InvoiceStatusUpdated {
        #[key]
        id: u256,
        old_status: felt252,
        new_status: felt252,
    }

    // Constructor
    #[constructor]
    fn constructor(
        ref self: ContractState,
        wbtc_token_address: ContractAddress,
        escrow_contract_address: ContractAddress,
        owner_address: ContractAddress,
    ) {
        // Validate addresses
        assert(!wbtc_token_address.is_zero(), 'WBTC address cannot be zero');
        assert(!escrow_contract_address.is_zero(), 'Escrow address cannot be zero');
        assert(!owner_address.is_zero(), 'Owner cannot be zero address');

        self.wbtc_token.write(wbtc_token_address);
        self.escrow_contract.write(escrow_contract_address);
        self.owner.write(owner_address);
        self.next_invoice_id.write(1_u256);
        self.locked.write(false);
    }

    // Implementation
    #[abi(embed_v0)]
    impl InvoiceRegistryImpl of super::IInvoiceRegistry<ContractState> {
        fn get_invoice(self: @ContractState, invoice_id: u256) -> Invoice {
            self.invoices.read(invoice_id)
        }

        fn get_next_invoice_id(self: @ContractState) -> u256 {
            self.next_invoice_id.read()
        }

        fn get_wbtc_address(self: @ContractState) -> ContractAddress {
            self.wbtc_token.read()
        }

        fn get_escrow_address(self: @ContractState) -> ContractAddress {
            self.escrow_contract.read()
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn create_invoice(
            ref self: ContractState,
            amount: u256,
            description: felt252,
            escrow_enabled: bool,
            expiry_timestamp: u64
        ) -> u256 {
            let creator = get_caller_address();

            // Validate inputs
            assert(amount > 0_u256, 'Amount must be greater than 0');
            assert(description != 0, 'Description cannot be empty');

            // Get current timestamp and validate expiry
            let current_timestamp = get_block_timestamp();
            assert(expiry_timestamp > current_timestamp, 'Expiry must be in future');

            // Get and increment invoice ID
            let invoice_id = self.next_invoice_id.read();
            self.next_invoice_id.write(invoice_id + 1_u256);

            // Create invoice
            let invoice = Invoice {
                id: invoice_id,
                creator,
                amount,
                description,
                escrow_enabled,
                expiry_timestamp,
                status: InvoiceStatus::PENDING,
                created_at: current_timestamp,
                paid_at: 0_u64,
            };

            // Store invoice
            self.invoices.write(invoice_id, invoice);

            // Emit event
            self.emit(InvoiceCreated {
                id: invoice_id,
                creator,
                amount,
                description,
                escrow_enabled,
                expiry_timestamp,
            });

            invoice_id
        }

        fn pay_invoice(ref self: ContractState, invoice_id: u256) -> bool {
            // Reentrancy guard
            self._lock();

            let payer = get_caller_address();
            let invoice = self.invoices.read(invoice_id);

            // Validate invoice exists
            assert(!invoice.creator.is_zero(), 'Invoice does not exist');

            // Validate invoice status
            assert(invoice.status == InvoiceStatus::PENDING, 'Invoice not pending');

            // Check expiry
            let current_timestamp = get_block_timestamp();
            assert(current_timestamp < invoice.expiry_timestamp, 'Invoice has expired');

            // Transfer tokens directly to creator (no escrow)
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer_from(payer, invoice.creator, invoice.amount);

            // Update invoice status and paid timestamp
            self._update_invoice_status(invoice_id, InvoiceStatus::PAID);
            self._update_paid_timestamp(invoice_id, current_timestamp);

            // Emit event
            self.emit(InvoicePaid {
                id: invoice_id,
                payer,
                amount: invoice.amount,
                escrow_enabled: false,
            });

            // Release reentrancy lock
            self._unlock();
            true
        }

        fn pay_invoice_with_escrow(ref self: ContractState, invoice_id: u256) -> bool {
            // Reentrancy guard
            self._lock();

            let payer = get_caller_address();
            let invoice = self.invoices.read(invoice_id);

            // Validate invoice exists
            assert(!invoice.creator.is_zero(), 'Invoice does not exist');

            // Validate invoice
            assert(invoice.status == InvoiceStatus::PENDING, 'Invoice not pending');
            assert(invoice.escrow_enabled, 'Escrow not enabled');

            // Check expiry
            let current_timestamp = get_block_timestamp();
            assert(current_timestamp < invoice.expiry_timestamp, 'Invoice has expired');

            // Deposit to escrow - escrow contract will handle the token transfer
            let escrow = IEscrowDispatcher { contract_address: self.escrow_contract.read() };
            escrow.deposit(invoice_id, payer, invoice.amount, invoice.creator);

            // Update invoice status and paid timestamp
            self._update_invoice_status(invoice_id, InvoiceStatus::PAID);
            self._update_paid_timestamp(invoice_id, current_timestamp);

            // Emit event
            self.emit(InvoicePaid {
                id: invoice_id,
                payer,
                amount: invoice.amount,
                escrow_enabled: true,
            });

            // Release reentrancy lock
            self._unlock();
            true
        }

        fn mark_invoice_expired(ref self: ContractState, invoice_id: u256) -> bool {
            let caller = get_caller_address();
            let invoice = self.invoices.read(invoice_id);
            let owner = self.owner.read();

            // Validate invoice exists
            assert(!invoice.creator.is_zero(), 'Invoice does not exist');

            // Only owner or invoice creator can mark as expired
            // Fixed: use OR logic instead of addition (which fails when caller is both)
            let is_owner = caller == owner;
            let is_creator = caller == invoice.creator;
            assert(is_owner || is_creator, 'Not authorized');

            // Only allow for pending invoices
            assert(invoice.status == InvoiceStatus::PENDING, 'Invoice not pending');

            // Check if actually expired
            let current_timestamp = get_block_timestamp();
            assert(current_timestamp >= invoice.expiry_timestamp, 'Invoice not yet expired');

            // Update status to expired
            self._update_invoice_status(invoice_id, InvoiceStatus::EXPIRED);

            true
        }

        fn release_escrow(ref self: ContractState, invoice_id: u256) -> bool {
            // Reentrancy guard
            self._lock();

            let caller = get_caller_address();
            let invoice = self.invoices.read(invoice_id);

            // Validate invoice exists
            assert(!invoice.creator.is_zero(), 'Invoice does not exist');

            // Only invoice creator can release escrow
            assert(caller == invoice.creator, 'Only creator can release');

            // Must be a paid invoice with escrow
            assert(invoice.status == InvoiceStatus::PAID, 'Invoice not paid');
            assert(invoice.escrow_enabled, 'Escrow not enabled');

            // Call escrow release
            let escrow = IEscrowDispatcher { contract_address: self.escrow_contract.read() };
            escrow.release(invoice_id);

            // Update invoice status
            self._update_invoice_status(invoice_id, InvoiceStatus::RELEASED);

            // Release reentrancy lock
            self._unlock();
            true
        }
    }

    // Internal functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _lock(ref self: ContractState) {
            assert(!self.locked.read(), 'Reentrant call');
            self.locked.write(true);
        }

        fn _unlock(ref self: ContractState) {
            self.locked.write(false);
        }

        fn _update_invoice_status(ref self: ContractState, invoice_id: u256, new_status: felt252) {
            let invoice = self.invoices.read(invoice_id);
            let old_status = invoice.status;

            // Update invoice with new status
            let updated_invoice = Invoice {
                id: invoice.id,
                creator: invoice.creator,
                amount: invoice.amount,
                description: invoice.description,
                escrow_enabled: invoice.escrow_enabled,
                expiry_timestamp: invoice.expiry_timestamp,
                status: new_status,
                created_at: invoice.created_at,
                paid_at: invoice.paid_at,
            };

            self.invoices.write(invoice_id, updated_invoice);

            // Emit status update event
            self.emit(InvoiceStatusUpdated {
                id: invoice_id,
                old_status,
                new_status,
            });
        }

        fn _update_paid_timestamp(ref self: ContractState, invoice_id: u256, timestamp: u64) {
            let invoice = self.invoices.read(invoice_id);

            let updated_invoice = Invoice {
                id: invoice.id,
                creator: invoice.creator,
                amount: invoice.amount,
                description: invoice.description,
                escrow_enabled: invoice.escrow_enabled,
                expiry_timestamp: invoice.expiry_timestamp,
                status: invoice.status,
                created_at: invoice.created_at,
                paid_at: timestamp,
            };

            self.invoices.write(invoice_id, updated_invoice);
        }
    }
}
