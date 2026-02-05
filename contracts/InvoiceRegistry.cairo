%lang cairo

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256, uint256_add, uint256_le
from starkware.starknet.common.syscalls import get_caller_address, get_block_timestamp
from starkware.cairo.common.math import assert_le

// Import Escrow interface
from contracts.Escrow import IEscrow

// Import IERC20 interface
from contracts.WrappedBTC import IERC20

// Import Escrow interface
@interface
    IEscrow {
        func deposit(invoiceId: Uint256, payer: felt, amount: Uint256, invoiceCreator: felt) -> (success: felt) {}
    }
@end

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
            owner: felt,
        }
        
        // Constructor
        @constructor
        func constructor{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(wbtcTokenAddress: felt, escrowContractAddress: felt, ownerAddress: felt) {
            wbtcToken.write(wbtcTokenAddress);
            escrowContract.write(escrowContractAddress);
            owner.write(ownerAddress);
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
        
        @view
        func getOwner{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }() -> (address: felt) {
            return (owner.read());
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
            
            // Get current timestamp
            let (timestamp) = get_block_timestamp();
            
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
            
            // Check expiry
            let (currentTimestamp) = get_block_timestamp();
            let (isExpired) = uint256_le(invoice.expiryTimestamp, currentTimestamp);
            // If expired, cannot pay
            assert isExpired = 0;
            
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
            let (timestamp) = get_block_timestamp();
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
            
            // Check expiry
            let (currentTimestamp) = get_block_timestamp();
            let (isExpired) = uint256_le(invoice.expiryTimestamp, currentTimestamp);
            // If expired, cannot pay
            assert isExpired = 0;
            
            // Call escrow deposit first
            let escrowAddr = escrowContract.read();
            IEscrow.deposit{contract_address: escrowAddr}(
                invoiceId: invoiceId,
                payer: payer,
                amount: invoice.amount,
                invoiceCreator: invoice.creator
            );
            
            // Update invoice status
            _updateInvoiceStatus(invoiceId, InvoiceStatus.PAID);
            
            // Update paid timestamp
            let updatedInvoice = invoices.read(invoiceId);
            let (timestamp) = get_block_timestamp();
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
            
            // Escrow deposit already called above
            
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
            let (caller) = get_caller_address();
            let invoice = invoices.read(invoiceId);
            let ownerAddr = owner.read();
            
            // Only owner or invoice creator can mark as expired
            let isOwner = caller = ownerAddr;
            let isCreator = caller = invoice.creator;
            let isValidCaller = isOwner + isCreator;
            assert isValidCaller = 1;
            
            // Only allow for pending invoices
            assert invoice.status = InvoiceStatus.PENDING;
            
            // Check if actually expired
            let (currentTimestamp) = get_block_timestamp();
            let (isExpired) = uint256_le(invoice.expiryTimestamp, currentTimestamp);
            assert isExpired = 1;
            
            // Update status to expired
            _updateInvoiceStatus(invoiceId, InvoiceStatus.EXPIRED);
            
            return (1);
        }
        
        @external
        func releaseEscrow{
            syscall_ptr: felt*,
            pedersen_ptr: HashBuiltin*,
            range_check_ptr,
        }(invoiceId: Uint256) -> (success: felt) {
            let (caller) = get_caller_address();
            let invoice = invoices.read(invoiceId);
            
            // Only invoice creator can release escrow
            assert caller = invoice.creator;
            
            // Must be a paid invoice with escrow
            assert invoice.status = InvoiceStatus.PAID;
            assert invoice.escrowEnabled = 1;
            
            // Call escrow release
            let escrowAddr = escrowContract.read();
            IEscrow.release{contract_address: escrowAddr}(invoiceId);
            
            // Update invoice status
            _updateInvoiceStatus(invoiceId, InvoiceStatus.RELEASED);
            
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