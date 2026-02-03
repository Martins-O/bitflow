%lang cairo

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256, uint256_eq
from starkware.starknet.common.syscalls import get_contract_address, get_caller_address

// IERC20 Interface
@interface
    IERC20 {
        func name() -> (res: felt) {}
        func symbol() -> (res: felt) {}
        func decimals() -> (res: felt) {}
        func totalSupply() -> (res: Uint256) {}
        func balanceOf(account: felt) -> (res: Uint256) {}
        func transfer(recipient: felt, amount: Uint256) -> (success: felt) {}
        func allowance(owner: felt, spender: felt) -> (res: Uint256) {}
        func approve(spender: felt, amount: Uint256) -> (success: felt) {}
        func transferFrom(
            sender: felt, recipient: felt, amount: Uint256
        ) -> (success: felt) {}
    }
@end

// Events
@event
    Transfer(from: felt, to: felt, value: Uint256)
@end

@event
    Approval(owner: felt, spender: felt, value: Uint256)
@end

// WrappedBTC ERC20 Implementation
@contract
    mod WrappedBTC {
        use starkware.cairo.common.cairo_builtins.HashBuiltin;
        use starkware.cairo.common.uint256;
        
        // Storage
        struct Storage {
            name: felt,
            symbol: felt,
            decimals: felt,
            totalSupply: Uint256,
            balances: LegacyMap<felt, Uint256>,
            allowances: LegacyMap<felt, LegacyMap<felt, Uint256>>,
        }
        
        // Constructor
        @constructor
        func constructor{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(
            name_: felt,
            symbol_: felt,
            decimals_: felt,
            initialSupply: Uint256,
            initialOwner: felt,
        ) {
            name.write(name_);
            symbol.write(symbol_);
            decimals.write(decimals_);
            totalSupply.write(initialSupply);
            balances.write(initialOwner, initialSupply);
            
            // Emit initial mint transfer
            Transfer.emit(
                from: 0, 
                to: initialOwner, 
                value: initialSupply
            );
            return ();
        }
        
        // View Functions
        @view
        func name{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (res: felt) {
            return (name.read());
        }
        
        @view
        func symbol{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (res: felt) {
            return (symbol.read());
        }
        
        @view
        func decimals{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (res: felt) {
            return (decimals.read());
        }
        
        @view
        func totalSupply{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (res: Uint256) {
            return (totalSupply.read());
        }
        
        @view
        func balanceOf{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(account: felt) -> (res: Uint256) {
            return (balances.read(account));
        }
        
        @view
        func allowance{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(owner: felt, spender: felt) -> (res: Uint256) {
            return (allowances.read(owner).read(spender));
        }
        
        // External Functions
        @external
        func transfer{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(recipient: felt, amount: Uint256) -> (success: felt) {
            let (caller) = get_caller_address();
            _transfer(caller, recipient, amount);
            return (1);
        }
        
        @external
        func approve{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(spender: felt, amount: Uint256) -> (success: felt) {
            let (owner) = get_caller_address();
            allowances.write(owner, spender, amount);
            Approval.emit(owner, spender, amount);
            return (1);
        }
        
        @external
        func transferFrom{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(
            sender: felt, recipient: felt, amount: Uint256
        ) -> (success: felt) {
            let (caller) = get_caller_address();
            let (currentAllowance) = allowance.read(sender, caller);
            
            // Check allowance
            let (isLessOrEqual) = uint256_le(amount, currentAllowance);
            assert isLessOrEqual = 1;
            
            // Update allowance
            let newAllowance = uint256_sub(currentAllowance, amount);
            allowances.write(sender, caller, newAllowance);
            
            // Transfer tokens
            _transfer(sender, recipient, amount);
            return (1);
        }
        
        // Mint function (for testing/demo purposes)
        @external
        func mint{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(to: felt, amount: Uint256) -> (success: felt) {
            let (caller) = get_caller_address();
            let (contractAddr) = get_contract_address();
            
            // Only contract owner can mint
            assert caller = contractAddr;
            
            let (currentSupply) = totalSupply.read();
            let newSupply = uint256_add(currentSupply, amount);
            totalSupply.write(newSupply);
            
            let (currentBalance) = balances.read(to);
            let newBalance = uint256_add(currentBalance, amount);
            balances.write(to, newBalance);
            
            Transfer.emit(from: 0, to: to, value: amount);
            return (1);
        }
        
        // Internal Functions
        func _transfer{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(sender: felt, recipient: felt, amount: Uint256) {
            let (senderBalance) = balances.read(sender);
            
            // Check balance
            let (isLessOrEqual) = uint256_le(amount, senderBalance);
            assert isLessOrEqual = 1;
            
            // Update balances
            let newSenderBalance = uint256_sub(senderBalance, amount);
            balances.write(sender, newSenderBalance);
            
            let (recipientBalance) = balances.read(recipient);
            let newRecipientBalance = uint256_add(recipientBalance, amount);
            balances.write(recipient, newRecipientBalance);
            
            Transfer.emit(sender, recipient, amount);
            return ();
        }
    }
@end