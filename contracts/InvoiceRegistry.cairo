%lang cairo

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256, uint256_add, uint256_le
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math import assert_le

// Import IERC20 interface
from contracts.WrappedBTC import IERC20

// Invoice Status Enum
namespace InvoiceStatus {
    const PENDING = 0;
    const PAID = 1;
    const RELEASED = 2;
    const EXPIRED = 3;
}

// Invoice Struct
struct Invoice {
    id: Uint256,
    creator: felt,
    amount: Uint256,
    description: felt,
    escrowEnabled: felt,
    expiryTimestamp: Uint256,
    status: felt,
    createdAt: Uint256,
    paidAt: Uint256,
}

// Events
@event
    InvoiceCreated(
        id: Uint256,
        creator: felt,
        amount: Uint256,
        description: felt,
        escrowEnabled: felt,
        expiryTimestamp: Uint256
    )
@end

@event
    InvoicePaid(
        id: Uint256,
        payer: felt,
        amount: Uint256,
        escrowEnabled: felt
    )
@end

@event
    InvoiceStatusUpdated(
        id: Uint256,
        oldStatus: felt,
        newStatus: felt
    )
@end

// InvoiceRegistry Contract
@contract
    mod InvoiceRegistry {
        use starkware.cairo.common.cairo_builtins.HashBuiltin;
        use starkware.cairo.common.uint256;
        use starkware.cairo.common.math;
        
        // Storage
        struct Storage {
            invoices: LegacyMap<Uint256, Invoice>,
            nextInvoiceId: Uint256,
            wbtcToken: felt,
            escrowContract: felt,
        }
        
        // Constructor
        @constructor
        func constructor{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(wbtcTokenAddress: felt, escrowContractAddress: felt) {
            wbtcToken.write(wbtcTokenAddress);
            escrowContract.write(escrowContractAddress);
            nextInvoiceId.write(Uint256(low: 1, high: 0));
            return ();
        }
        
        // View Functions
        @view
        func getInvoice{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256) -> (invoice: Invoice) {
            let invoice = invoices.read(invoiceId);
            return (invoice);
        }
        
        @view
        func getNextInvoiceId{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (id: Uint256) {
            return (nextInvoiceId.read());
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
        func getEscrowAddress{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (address: felt) {
            return (escrowContract.read());
        }
        
        // External Functions
        @external
        func createInvoice{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(
            amount: Uint256,
            description: felt,
            escrowEnabled: felt,
            expiryTimestamp: Uint256
        ) -> (invoiceId: Uint256) {
            let (creator) = get_caller_address();
            
            // Validate inputs
            assert_not_zero(amount.low);
            assert_not_zero(description);
            
            // Get next invoice ID
            let currentId = nextInvoiceId.read();
            let invoiceId = currentId;
            
            // Update next invoice ID
            let nextId = uint256_add(currentId, Uint256(low: 1, high: 0));
            nextInvoiceId.write(nextId);
            
            // Get current timestamp (simplified - using block timestamp if available)
            // For demo purposes, using a fixed timestamp
            let timestamp = Uint256(low: 1640995200, high: 0); // 2022-01-01 00:00:00 UTC
            
            // Create invoice
            let invoice = Invoice(
                id: invoiceId,
                creator: creator,
                amount: amount,
                description: description,
                escrowEnabled: escrowEnabled,
                expiryTimestamp: expiryTimestamp,
                status: InvoiceStatus.PENDING,
                createdAt: timestamp,
                paidAt: Uint256(low: 0, high: 0)
            );
            
            // Store invoice
            invoices.write(invoiceId, invoice);
            
            // Emit event
            InvoiceCreated.emit(
                id: invoiceId,
                creator: creator,
                amount: amount,
                description: description,
                escrowEnabled: escrowEnabled,
                expiryTimestamp: expiryTimestamp
            );
            
            return (invoiceId);
        }
        
        @external
        func payInvoice{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256) -> (success: felt) {
            let (payer) = get_caller_address();
            let invoice = invoices.read(invoiceId);
            
            // Validate invoice status
            assert invoice.status = InvoiceStatus.PENDING;
            
            // Check expiry (simplified - in production would use actual timestamp)
            // For demo, skipping expiry check
            
            // Transfer tokens
            let wbtcAddr = wbtcToken.read();
            IERC20.transferFrom{contract_address: wbtcAddr}(
                sender: payer,
                recipient: invoice.creator,
                amount: invoice.amount
            );
            
            // Update invoice status
            _updateInvoiceStatus(invoiceId, InvoiceStatus.PAID);
            
            // Update paid timestamp
            let updatedInvoice = invoices.read(invoiceId);
            let timestamp = Uint256(low: 1640995300, high: 0); // Simplified timestamp
            let newInvoice = Invoice(
                id: updatedInvoice.id,
                creator: updatedInvoice.creator,
                amount: updatedInvoice.amount,
                description: updatedInvoice.description,
                escrowEnabled: updatedInvoice.escrowEnabled,
                expiryTimestamp: updatedInvoice.expiryTimestamp,
                status: updatedInvoice.status,
                createdAt: updatedInvoice.createdAt,
                paidAt: timestamp
            );
            invoices.write(invoiceId, newInvoice);
            
            // Emit event
            InvoicePaid.emit(
                id: invoiceId,
                payer: payer,
                amount: invoice.amount,
                escrowEnabled: invoice.escrowEnabled
            );
            
            return (1);
        }
        
        @external
        func payInvoiceWithEscrow{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256) -> (success: felt) {
            let (payer) = get_caller_address();
            let invoice = invoices.read(invoiceId);
            
            // Validate invoice
            assert invoice.status = InvoiceStatus.PENDING;
            assert invoice.escrowEnabled = 1;
            
            // Transfer tokens to escrow contract
            let wbtcAddr = wbtcToken.read();
            let escrowAddr = escrowContract.read();
            IERC20.transferFrom{contract_address: wbtcAddr}(
                sender: payer,
                recipient: escrowAddr,
                amount: invoice.amount
            );
            
            // Update invoice status
            _updateInvoiceStatus(invoiceId, InvoiceStatus.PAID);
            
            // Update paid timestamp
            let updatedInvoice = invoices.read(invoiceId);
            let timestamp = Uint256(low: 1640995300, high: 0); // Simplified timestamp
            let newInvoice = Invoice(
                id: updatedInvoice.id,
                creator: updatedInvoice.creator,
                amount: updatedInvoice.amount,
                description: updatedInvoice.description,
                escrowEnabled: updatedInvoice.escrowEnabled,
                expiryTimestamp: updatedInvoice.expiryTimestamp,
                status: updatedInvoice.status,
                createdAt: updatedInvoice.createdAt,
                paidAt: timestamp
            );
            invoices.write(invoiceId, newInvoice);
            
            // Notify escrow contract
            // In a real implementation, this would call escrow.deposit()
            
            // Emit event
            InvoicePaid.emit(
                id: invoiceId,
                payer: payer,
                amount: invoice.amount,
                escrowEnabled: 1
            );
            
            return (1);
        }
        
        @external
        func markInvoiceExpired{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256) -> (success: felt) {
            let invoice = invoices.read(invoiceId);
            
            // Only allow for pending invoices
            assert invoice.status = InvoiceStatus.PENDING;
            
            // Update status to expired
            _updateInvoiceStatus(invoiceId, InvoiceStatus.EXPIRED);
            
            return (1);
        }
        
        // Internal Functions
        func _updateInvoiceStatus{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256, newStatus: felt) {
            let invoice = invoices.read(invoiceId);
            let oldStatus = invoice.status;
            
            // Update invoice with new status
            let updatedInvoice = Invoice(
                id: invoice.id,
                creator: invoice.creator,
                amount: invoice.amount,
                description: invoice.description,
                escrowEnabled: invoice.escrowEnabled,
                expiryTimestamp: invoice.expiryTimestamp,
                status: newStatus,
                createdAt: invoice.createdAt,
                paidAt: invoice.paidAt
            );
            
            invoices.write(invoiceId, updatedInvoice);
            
            // Emit status update event
            InvoiceStatusUpdated.emit(
                id: invoiceId,
                oldStatus: oldStatus,
                newStatus: newStatus
            );
            
            return ();
        }
    }
@end