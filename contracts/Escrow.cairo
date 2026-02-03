%lang cairo

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256, uint256_add, uint256_sub, uint256_le
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math import assert_le

// Import IERC20 interface
from contracts.WrappedBTC import IERC20

// Escrow Entry Struct
struct EscrowEntry {
    invoiceId: Uint256,
    invoiceCreator: felt,
    amount: Uint256,
    createdAt: Uint256,
    releasedAt: Uint256,
    isActive: felt,
}

// Events
@event
    EscrowDeposited(
        invoiceId: Uint256,
        payer: felt,
        amount: Uint256,
        invoiceCreator: felt
    )
@end

@event
    EscrowReleased(
        invoiceId: Uint256,
        recipient: felt,
        amount: Uint256,
        releasedBy: felt
    )
@end

@event
    EscrowRefunded(
        invoiceId: Uint256,
        refundee: felt,
        amount: Uint256,
        reason: felt
    )
@end

// Escrow Contract
@contract
    mod Escrow {
        use starkware.cairo.common.cairo_builtins.HashBuiltin;
        use starkware.cairo.common.uint256;
        use starkware.cairo.common.math;
        
        // Storage
        struct Storage {
            escrows: LegacyMap<Uint256, EscrowEntry>,
            wbtcToken: felt,
            invoiceRegistry: felt,
            totalEscrowed: Uint256,
        }
        
        // Constructor
        @constructor
        func constructor{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(wbtcTokenAddress: felt, invoiceRegistryAddress: felt) {
            wbtcToken.write(wbtcTokenAddress);
            invoiceRegistry.write(invoiceRegistryAddress);
            totalEscrowed.write(Uint256(low: 0, high: 0));
            return ();
        }
        
        // View Functions
        @view
        func getEscrow{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256) -> (escrow: EscrowEntry) {
            let escrow = escrows.read(invoiceId);
            return (escrow);
        }
        
        @view
        func getWBTCAddress{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (address: felt) {
            return (wbtcToken.read());
        }
        
        @view
        func getInvoiceRegistryAddress{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (address: felt) {
            return (invoiceRegistry.read());
        }
        
        @view
        func getTotalEscrowed{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (amount: Uint256) {
            return (totalEscrowed.read());
        }
        
        // External Functions
        @external
        func deposit{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(
            invoiceId: Uint256,
            payer: felt,
            amount: Uint256,
            invoiceCreator: felt
        ) -> (success: felt) {
            
            // Validate inputs
            assert_not_zero(amount.low);
            
            // Check if escrow already exists
            let existingEscrow = escrows.read(invoiceId);
            assert existingEscrow.isActive = 0;
            
            // Get current timestamp (simplified)
            let timestamp = Uint256(low: 1640995400, high: 0); // Simplified timestamp
            
            // Create escrow entry
            let escrowEntry = EscrowEntry(
                invoiceId: invoiceId,
                invoiceCreator: invoiceCreator,
                amount: amount,
                createdAt: timestamp,
                releasedAt: Uint256(low: 0, high: 0),
                isActive: 1
            );
            
            // Store escrow
            escrows.write(invoiceId, escrowEntry);
            
            // Update total escrowed amount
            let currentTotal = totalEscrowed.read();
            let newTotal = uint256_add(currentTotal, amount);
            totalEscrowed.write(newTotal);
            
            // Transfer tokens from payer to escrow contract
            let (escrowContract) = get_contract_address();
            let wbtcAddr = wbtcToken.read();
            IERC20.transferFrom{contract_address: wbtcAddr}(
                sender: payer,
                recipient: escrowContract,
                amount: amount
            );
            
            // Emit event
            EscrowDeposited.emit(
                invoiceId: invoiceId,
                payer: payer,
                amount: amount,
                invoiceCreator: invoiceCreator
            );
            
            return (1);
        }
        
        @external
        func release{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256) -> (success: felt) {
            let (caller) = get_caller_address();
            let escrow = escrows.read(invoiceId);
            
            // Validate escrow
            assert escrow.isActive = 1;
            assert escrow.invoiceCreator = caller; // Only creator can release
            
            // Get current timestamp
            let timestamp = Uint256(low: 1640995500, high: 0); // Simplified timestamp
            
            // Update escrow entry
            let updatedEscrow = EscrowEntry(
                invoiceId: escrow.invoiceId,
                invoiceCreator: escrow.invoiceCreator,
                amount: escrow.amount,
                createdAt: escrow.createdAt,
                releasedAt: timestamp,
                isActive: 0
            );
            escrows.write(invoiceId, updatedEscrow);
            
            // Update total escrowed amount
            let currentTotal = totalEscrowed.read();
            let newTotal = uint256_sub(currentTotal, escrow.amount);
            totalEscrowed.write(newTotal);
            
            // Transfer tokens to creator
            let (escrowContract) = get_contract_address();
            let wbtcAddr = wbtcToken.read();
            IERC20.transfer{contract_address: wbtcAddr}(
                recipient: escrow.invoiceCreator,
                amount: escrow.amount
            );
            
            // Emit event
            EscrowReleased.emit(
                invoiceId: invoiceId,
                recipient: escrow.invoiceCreator,
                amount: escrow.amount,
                releasedBy: caller
            );
            
            return (1);
        }
        
        @external
        func refundAfterExpiry{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256, refundee: felt, reason: felt) -> (success: felt) {
            let escrow = escrows.read(invoiceId);
            
            // Validate escrow
            assert escrow.isActive = 1;
            
            // In a real implementation, would check invoice expiry
            // For demo, allowing any refund
            
            // Get current timestamp
            let timestamp = Uint256(low: 1640995600, high: 0); // Simplified timestamp
            
            // Update escrow entry
            let updatedEscrow = EscrowEntry(
                invoiceId: escrow.invoiceId,
                invoiceCreator: escrow.invoiceCreator,
                amount: escrow.amount,
                createdAt: escrow.createdAt,
                releasedAt: timestamp,
                isActive: 0
            );
            escrows.write(invoiceId, updatedEscrow);
            
            // Update total escrowed amount
            let currentTotal = totalEscrowed.read();
            let newTotal = uint256_sub(currentTotal, escrow.amount);
            totalEscrowed.write(newTotal);
            
            // Transfer tokens to refundee
            let (escrowContract) = get_contract_address();
            let wbtcAddr = wbtcToken.read();
            IERC20.transfer{contract_address: wbtcAddr}(
                recipient: refundee,
                amount: escrow.amount
            );
            
            // Emit event
            EscrowRefunded.emit(
                invoiceId: invoiceId,
                refundee: refundee,
                amount: escrow.amount,
                reason: reason
            );
            
            return (1);
        }
        
        @external
        func emergencyWithdraw{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256, recipient: felt) -> (success: felt) {
            let (caller) = get_caller_address();
            let (contractAddress) = get_contract_address();
            
            // Only contract owner can emergency withdraw
            assert caller = contractAddress;
            
            let escrow = escrows.read(invoiceId);
            
            // Validate escrow
            assert escrow.isActive = 1;
            
            // Get current timestamp
            let timestamp = Uint256(low: 1640995700, high: 0); // Simplified timestamp
            
            // Update escrow entry
            let updatedEscrow = EscrowEntry(
                invoiceId: escrow.invoiceId,
                invoiceCreator: escrow.invoiceCreator,
                amount: escrow.amount,
                createdAt: escrow.createdAt,
                releasedAt: timestamp,
                isActive: 0
            );
            escrows.write(invoiceId, updatedEscrow);
            
            // Update total escrowed amount
            let currentTotal = totalEscrowed.read();
            let newTotal = uint256_sub(currentTotal, escrow.amount);
            totalEscrowed.write(newTotal);
            
            // Transfer tokens to specified recipient
            let wbtcAddr = wbtcToken.read();
            IERC20.transfer{contract_address: wbtcAddr}(
                recipient: recipient,
                amount: escrow.amount
            );
            
            return (1);
        }
    }
@end