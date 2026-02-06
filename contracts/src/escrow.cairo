// SPDX-License-Identifier: MIT
// Escrow - Secure Fund Escrow for BitFlow Payment System
// Cairo 1.0 Implementation

use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
struct EscrowEntry {
    invoice_id: u256,
    payer: ContractAddress,
    invoice_creator: ContractAddress,
    amount: u256,
    created_at: u64,
    released_at: u64,
    is_active: bool,
}

#[starknet::interface]
trait IEscrow<TContractState> {
    // View functions
    fn get_escrow(self: @TContractState, invoice_id: u256) -> EscrowEntry;
    fn get_wbtc_address(self: @TContractState) -> ContractAddress;
    fn get_invoice_registry_address(self: @TContractState) -> ContractAddress;
    fn get_total_escrowed(self: @TContractState) -> u256;
    fn get_owner(self: @TContractState) -> ContractAddress;

    // External functions
    fn deposit(
        ref self: TContractState,
        invoice_id: u256,
        payer: ContractAddress,
        amount: u256,
        invoice_creator: ContractAddress,
    ) -> bool;
    fn release(ref self: TContractState, invoice_id: u256) -> bool;
    fn refund_after_expiry(ref self: TContractState, invoice_id: u256) -> bool;
    fn emergency_withdraw(ref self: TContractState, invoice_id: u256, recipient: ContractAddress) -> bool;
}

// ERC20 Interface for token transfers
#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
}

#[starknet::contract]
mod Escrow {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use core::num::traits::Zero;
    use super::{EscrowEntry, IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    struct Storage {
        escrows: Map<u256, EscrowEntry>,
        wbtc_token: ContractAddress,
        invoice_registry: ContractAddress,
        total_escrowed: u256,
        owner: ContractAddress,
        // Reentrancy guard
        locked: bool,
    }

    // Events
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        EscrowDeposited: EscrowDeposited,
        EscrowReleased: EscrowReleased,
        EscrowRefunded: EscrowRefunded,
    }

    #[derive(Drop, starknet::Event)]
    struct EscrowDeposited {
        #[key]
        invoice_id: u256,
        #[key]
        payer: ContractAddress,
        amount: u256,
        invoice_creator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct EscrowReleased {
        #[key]
        invoice_id: u256,
        recipient: ContractAddress,
        amount: u256,
        released_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct EscrowRefunded {
        #[key]
        invoice_id: u256,
        refundee: ContractAddress,
        amount: u256,
    }

    // Constructor
    #[constructor]
    fn constructor(
        ref self: ContractState,
        wbtc_token_address: ContractAddress,
        invoice_registry_address: ContractAddress,
        owner_address: ContractAddress,
    ) {
        assert(!wbtc_token_address.is_zero(), 'WBTC address cannot be zero');
        assert(!invoice_registry_address.is_zero(), 'Registry addr cannot be zero');
        assert(!owner_address.is_zero(), 'Owner cannot be zero address');

        self.wbtc_token.write(wbtc_token_address);
        self.invoice_registry.write(invoice_registry_address);
        self.owner.write(owner_address);
        self.total_escrowed.write(0_u256);
        self.locked.write(false);
    }

    #[abi(embed_v0)]
    impl EscrowImpl of super::IEscrow<ContractState> {
        fn get_escrow(self: @ContractState, invoice_id: u256) -> EscrowEntry {
            self.escrows.read(invoice_id)
        }

        fn get_wbtc_address(self: @ContractState) -> ContractAddress {
            self.wbtc_token.read()
        }

        fn get_invoice_registry_address(self: @ContractState) -> ContractAddress {
            self.invoice_registry.read()
        }

        fn get_total_escrowed(self: @ContractState) -> u256 {
            self.total_escrowed.read()
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn deposit(
            ref self: ContractState,
            invoice_id: u256,
            payer: ContractAddress,
            amount: u256,
            invoice_creator: ContractAddress,
        ) -> bool {
            // Reentrancy guard
            self._lock();

            let caller = get_caller_address();

            // SECURITY: Only the InvoiceRegistry contract can call deposit
            let registry = self.invoice_registry.read();
            assert(caller == registry, 'Only registry can deposit');

            // Validate inputs
            assert(!payer.is_zero(), 'Payer cannot be zero address');
            assert(!invoice_creator.is_zero(), 'Creator cannot be zero address');
            assert(amount > 0_u256, 'Amount must be greater than 0');

            // Check if escrow already exists for this invoice
            let existing = self.escrows.read(invoice_id);
            assert(!existing.is_active, 'Escrow already exists');

            let current_timestamp = get_block_timestamp();

            // Create escrow entry
            let escrow_entry = EscrowEntry {
                invoice_id,
                payer,
                invoice_creator,
                amount,
                created_at: current_timestamp,
                released_at: 0_u64,
                is_active: true,
            };

            // Store escrow
            self.escrows.write(invoice_id, escrow_entry);

            // Update total escrowed
            let current_total = self.total_escrowed.read();
            self.total_escrowed.write(current_total + amount);

            // Transfer tokens from payer to this escrow contract
            let this_contract = get_contract_address();
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer_from(payer, this_contract, amount);

            // Emit event
            self.emit(EscrowDeposited {
                invoice_id,
                payer,
                amount,
                invoice_creator,
            });

            self._unlock();
            true
        }

        fn release(ref self: ContractState, invoice_id: u256) -> bool {
            // Reentrancy guard
            self._lock();

            let caller = get_caller_address();

            // SECURITY: Only the InvoiceRegistry contract can trigger release
            let registry = self.invoice_registry.read();
            assert(caller == registry, 'Only registry can release');

            let escrow = self.escrows.read(invoice_id);

            // Validate escrow is active
            assert(escrow.is_active, 'Escrow not active');

            let current_timestamp = get_block_timestamp();

            // Deactivate escrow
            let updated_escrow = EscrowEntry {
                invoice_id: escrow.invoice_id,
                payer: escrow.payer,
                invoice_creator: escrow.invoice_creator,
                amount: escrow.amount,
                created_at: escrow.created_at,
                released_at: current_timestamp,
                is_active: false,
            };
            self.escrows.write(invoice_id, updated_escrow);

            // Update total escrowed
            let current_total = self.total_escrowed.read();
            self.total_escrowed.write(current_total - escrow.amount);

            // Transfer tokens to the invoice creator
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer(escrow.invoice_creator, escrow.amount);

            // Emit event
            self.emit(EscrowReleased {
                invoice_id,
                recipient: escrow.invoice_creator,
                amount: escrow.amount,
                released_by: caller,
            });

            self._unlock();
            true
        }

        fn refund_after_expiry(ref self: ContractState, invoice_id: u256) -> bool {
            // Reentrancy guard
            self._lock();

            let caller = get_caller_address();
            let escrow = self.escrows.read(invoice_id);
            let owner = self.owner.read();

            // Validate escrow is active
            assert(escrow.is_active, 'Escrow not active');

            // SECURITY: Only owner or the original payer can trigger refund
            let is_owner = caller == owner;
            let is_payer = caller == escrow.payer;
            assert(is_owner || is_payer, 'Not authorized to refund');

            let current_timestamp = get_block_timestamp();

            // Deactivate escrow
            let updated_escrow = EscrowEntry {
                invoice_id: escrow.invoice_id,
                payer: escrow.payer,
                invoice_creator: escrow.invoice_creator,
                amount: escrow.amount,
                created_at: escrow.created_at,
                released_at: current_timestamp,
                is_active: false,
            };
            self.escrows.write(invoice_id, updated_escrow);

            // Update total escrowed
            let current_total = self.total_escrowed.read();
            self.total_escrowed.write(current_total - escrow.amount);

            // SECURITY: Refund goes back to the original payer, not an arbitrary address
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer(escrow.payer, escrow.amount);

            // Emit event
            self.emit(EscrowRefunded {
                invoice_id,
                refundee: escrow.payer,
                amount: escrow.amount,
            });

            self._unlock();
            true
        }

        fn emergency_withdraw(
            ref self: ContractState,
            invoice_id: u256,
            recipient: ContractAddress,
        ) -> bool {
            // Reentrancy guard
            self._lock();

            let caller = get_caller_address();
            let owner = self.owner.read();

            // SECURITY: Only owner can emergency withdraw
            assert(caller == owner, 'Only owner can withdraw');
            assert(!recipient.is_zero(), 'Recipient cannot be zero');

            let escrow = self.escrows.read(invoice_id);

            // Validate escrow is active
            assert(escrow.is_active, 'Escrow not active');

            let current_timestamp = get_block_timestamp();

            // Deactivate escrow
            let updated_escrow = EscrowEntry {
                invoice_id: escrow.invoice_id,
                payer: escrow.payer,
                invoice_creator: escrow.invoice_creator,
                amount: escrow.amount,
                created_at: escrow.created_at,
                released_at: current_timestamp,
                is_active: false,
            };
            self.escrows.write(invoice_id, updated_escrow);

            // Update total escrowed
            let current_total = self.total_escrowed.read();
            self.total_escrowed.write(current_total - escrow.amount);

            // Transfer tokens to specified recipient
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer(recipient, escrow.amount);

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
    }
}
