// SPDX-License-Identifier: MIT
// WrappedBTC - ERC20 Token for BitFlow Payment System
// Cairo 1.0 Implementation

use starknet::ContractAddress;

#[starknet::interface]
trait IERC20<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
trait IERC20Mintable<TContractState> {
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256) -> bool;
    fn get_owner(self: @TContractState) -> ContractAddress;
}

#[starknet::contract]
mod WrappedBTC {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use core::num::traits::Zero;

    // Storage
    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        owner: ContractAddress,
    }

    // Events
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        #[key]
        owner: ContractAddress,
        #[key]
        spender: ContractAddress,
        value: u256,
    }

    // Constructor
    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        symbol: felt252,
        decimals: u8,
        initial_supply: u256,
        owner: ContractAddress,
    ) {
        // Validate owner is not zero address
        assert(!owner.is_zero(), 'Owner cannot be zero address');

        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(decimals);
        self.owner.write(owner);
        self.total_supply.write(initial_supply);
        self.balances.write(owner, initial_supply);

        // Emit transfer event for initial mint
        self.emit(Transfer {
            from: Zero::zero(),
            to: owner,
            value: initial_supply,
        });
    }

    // ERC20 Implementation
    #[abi(embed_v0)]
    impl ERC20Impl of super::IERC20<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) -> bool {
            let caller = get_caller_address();
            let current_allowance = self.allowances.read((sender, caller));

            // Check allowance
            assert(current_allowance >= amount, 'Insufficient allowance');

            // Update allowance
            self.allowances.write((sender, caller), current_allowance - amount);

            // Transfer tokens
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();

            // Validate spender is not zero address
            assert(!spender.is_zero(), 'Spender cannot be zero');

            self.allowances.write((owner, spender), amount);

            self.emit(Approval {
                owner,
                spender,
                value: amount,
            });
            true
        }
    }

    // Mintable Implementation
    #[abi(embed_v0)]
    impl ERC20MintableImpl of super::IERC20Mintable<ContractState> {
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) -> bool {
            // Only owner can mint
            let caller = get_caller_address();
            let owner = self.owner.read();
            assert(caller == owner, 'Only owner can mint');

            // Validate recipient is not zero address
            assert(!to.is_zero(), 'Cannot mint to zero address');

            // Update total supply
            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply + amount);

            // Update recipient balance
            let current_balance = self.balances.read(to);
            self.balances.write(to, current_balance + amount);

            // Emit transfer event
            self.emit(Transfer {
                from: Zero::zero(),
                to,
                value: amount,
            });
            true
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
    }

    // Internal functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) {
            // Validate addresses
            assert(!sender.is_zero(), 'Transfer from zero address');
            assert(!recipient.is_zero(), 'Transfer to zero address');

            // Check balance
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');

            // Update balances
            self.balances.write(sender, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);

            // Emit transfer event
            self.emit(Transfer {
                from: sender,
                to: recipient,
                value: amount,
            });
        }
    }
}
