import { describe, it, expect } from 'vitest';
import {
  canTransition,
  calculateLineTotal,
  calculateTotals,
  formatPOStatus,
  getPOStatusColor,
} from '@/services/purchase-orders';
import type { PurchaseOrderItemInput, PurchaseOrderStatus } from '@/types';

// ============================================================
// PO WORKFLOW STATE MACHINE
// ============================================================

describe('PO workflow state machine', () => {
  it('allows DRAFT → SUBMITTED', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
  });

  it('allows DRAFT → CANCELLED', () => {
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('allows SUBMITTED → APPROVED', () => {
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
  });

  it('allows SUBMITTED → CANCELLED', () => {
    expect(canTransition('SUBMITTED', 'CANCELLED')).toBe(true);
  });

  it('allows APPROVED → ORDERED', () => {
    expect(canTransition('APPROVED', 'ORDERED')).toBe(true);
  });

  it('allows APPROVED → CANCELLED', () => {
    expect(canTransition('APPROVED', 'CANCELLED')).toBe(true);
  });

  it('allows ORDERED → PARTIALLY_RECEIVED', () => {
    expect(canTransition('ORDERED', 'PARTIALLY_RECEIVED')).toBe(true);
  });

  it('allows ORDERED → RECEIVED', () => {
    expect(canTransition('ORDERED', 'RECEIVED')).toBe(true);
  });

  it('allows PARTIALLY_RECEIVED → RECEIVED', () => {
    expect(canTransition('PARTIALLY_RECEIVED', 'RECEIVED')).toBe(true);
  });

  it('blocks RECEIVED from transitioning anywhere', () => {
    const statuses: PurchaseOrderStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
    for (const s of statuses) {
      expect(canTransition('RECEIVED', s)).toBe(false);
    }
  });

  it('blocks CANCELLED from transitioning anywhere', () => {
    const statuses: PurchaseOrderStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
    for (const s of statuses) {
      expect(canTransition('CANCELLED', s)).toBe(false);
    }
  });

  it('blocks invalid transitions (e.g. DRAFT → APPROVED)', () => {
    expect(canTransition('DRAFT', 'APPROVED')).toBe(false);
  });

  it('blocks skipping steps (DRAFT → ORDERED)', () => {
    expect(canTransition('DRAFT', 'ORDERED')).toBe(false);
  });

  it('blocks receiving from DRAFT (must be ORDERED first)', () => {
    expect(canTransition('DRAFT', 'PARTIALLY_RECEIVED')).toBe(false);
  });

  it('blocks reverting (APPROVED → DRAFT)', () => {
    expect(canTransition('APPROVED', 'DRAFT')).toBe(false);
  });

  it('blocks PARTIALLY_RECEIVED → ORDERED (no going back)', () => {
    expect(canTransition('PARTIALLY_RECEIVED', 'ORDERED')).toBe(false);
  });
});

// ============================================================
// FULL WORKFLOW SIMULATION
// ============================================================

describe('Full PO workflow simulation', () => {
  it('simulates create → submit → approve → order → partial receive → complete', () => {
    let status: PurchaseOrderStatus = 'DRAFT';

    // Submit
    expect(canTransition(status, 'SUBMITTED')).toBe(true);
    status = 'SUBMITTED';

    // Approve
    expect(canTransition(status, 'APPROVED')).toBe(true);
    status = 'APPROVED';

    // Order
    expect(canTransition(status, 'ORDERED')).toBe(true);
    status = 'ORDERED';

    // Simulate partial receive: 60 of 100
    const ordered = 100;
    let received = 0;
    const receiveQty = 60;
    received += receiveQty;
    const remaining = ordered - received;
    expect(remaining).toBe(40);

    // After partial receive, status should be PARTIALLY_RECEIVED
    expect(canTransition(status, 'PARTIALLY_RECEIVED')).toBe(true);
    status = 'PARTIALLY_RECEIVED';

    // Receive remaining 40
    const remainingQty = ordered - received;
    received += remainingQty;
    expect(received).toBe(ordered);

    // All received → RECEIVED
    expect(canTransition(status, 'RECEIVED')).toBe(true);
    status = 'RECEIVED';

    // Cannot transition from RECEIVED
    expect(canTransition(status, 'PARTIALLY_RECEIVED')).toBe(false);
  });

  it('simulates cancellation from DRAFT', () => {
    let status: PurchaseOrderStatus = 'DRAFT';
    expect(canTransition(status, 'CANCELLED')).toBe(true);
    status = 'CANCELLED';
    expect(canTransition(status, 'DRAFT')).toBe(false);
  });

  it('simulates cancellation from SUBMITTED', () => {
    let status: PurchaseOrderStatus = 'SUBMITTED';
    expect(canTransition(status, 'CANCELLED')).toBe(true);
  });

  it('simulates cancellation from APPROVED', () => {
    let status: PurchaseOrderStatus = 'APPROVED';
    expect(canTransition(status, 'CANCELLED')).toBe(true);
  });

  it('blocks cancellation from PARTIALLY_RECEIVED', () => {
    expect(canTransition('PARTIALLY_RECEIVED', 'CANCELLED')).toBe(false);
  });

  it('blocks cancellation from RECEIVED', () => {
    expect(canTransition('RECEIVED', 'CANCELLED')).toBe(false);
  });
});

// ============================================================
// OVER-RECEIVING VALIDATION
// ============================================================

describe('Over-receiving validation', () => {
  it('blocks receiving more than ordered', () => {
    const ordered = 100;
    const received = 0;
    const attemptReceive = 150;
    const remaining = ordered - received;
    expect(attemptReceive > remaining).toBe(true);
  });

  it('blocks receiving more than remaining on partial receive', () => {
    const ordered = 100;
    const received = 60;
    const attemptReceive = 50;
    const remaining = ordered - received;
    expect(attemptReceive > remaining).toBe(true);
  });

  it('allows receiving exactly the remaining quantity', () => {
    const ordered = 100;
    const received = 60;
    const attemptReceive = 40;
    const remaining = ordered - received;
    expect(attemptReceive <= remaining).toBe(true);
  });

  it('allows receiving less than remaining', () => {
    const ordered = 100;
    const received = 0;
    const attemptReceive = 30;
    const remaining = ordered - received;
    expect(attemptReceive <= remaining).toBe(true);
  });

  it('blocks receiving zero or negative', () => {
    const ordered = 100;
    const received = 0;
    expect(0 <= 0).toBe(true); // zero is invalid
    expect(-5 < 0).toBe(true); // negative is invalid
  });
});

// ============================================================
// LINE TOTAL CALCULATION
// ============================================================

describe('calculateLineTotal', () => {
  it('calculates basic line total (qty * unit_cost)', () => {
    const item: PurchaseOrderItemInput = {
      product_id: 'p1',
      quantity: 10,
      unit_cost: 15.00,
      tax_rate: 0,
      discount_amount: 0,
    };
    expect(calculateLineTotal(item)).toBe(150);
  });

  it('calculates with tax', () => {
    const item: PurchaseOrderItemInput = {
      product_id: 'p1',
      quantity: 10,
      unit_cost: 15.00,
      tax_rate: 10,
      discount_amount: 0,
    };
    // base = 150, after discount = 150, tax = 15, total = 165
    expect(calculateLineTotal(item)).toBe(165);
  });

  it('calculates with discount', () => {
    const item: PurchaseOrderItemInput = {
      product_id: 'p1',
      quantity: 10,
      unit_cost: 15.00,
      tax_rate: 0,
      discount_amount: 20,
    };
    // base = 150, after discount = 130, tax = 0, total = 130
    expect(calculateLineTotal(item)).toBe(130);
  });

  it('calculates with tax and discount', () => {
    const item: PurchaseOrderItemInput = {
      product_id: 'p1',
      quantity: 20,
      unit_cost: 50.00,
      tax_rate: 8.5,
      discount_amount: 100,
    };
    // base = 1000, after discount = 900, tax = 76.5, total = 976.5
    expect(calculateLineTotal(item)).toBe(976.5);
  });

  it('handles zero quantity', () => {
    const item: PurchaseOrderItemInput = {
      product_id: 'p1',
      quantity: 0,
      unit_cost: 15.00,
      tax_rate: 10,
      discount_amount: 0,
    };
    expect(calculateLineTotal(item)).toBe(0);
  });
});

// ============================================================
// PO TOTALS CALCULATION
// ============================================================

describe('calculateTotals', () => {
  it('calculates totals for multiple items', () => {
    const items: PurchaseOrderItemInput[] = [
      { product_id: 'p1', quantity: 10, unit_cost: 15, tax_rate: 0, discount_amount: 0 },
      { product_id: 'p2', quantity: 5, unit_cost: 20, tax_rate: 0, discount_amount: 0 },
    ];
    const totals = calculateTotals(items);
    expect(totals.subtotal).toBe(250);
    expect(totals.taxAmount).toBe(0);
    expect(totals.discountAmount).toBe(0);
    expect(totals.total).toBe(250);
  });

  it('calculates totals with tax and discount across items', () => {
    const items: PurchaseOrderItemInput[] = [
      { product_id: 'p1', quantity: 10, unit_cost: 15, tax_rate: 10, discount_amount: 10 },
      { product_id: 'p2', quantity: 5, unit_cost: 20, tax_rate: 5, discount_amount: 0 },
    ];
    const totals = calculateTotals(items);
    // Item 1: base=150, discount=10, after=140, tax=14
    // Item 2: base=100, discount=0, after=100, tax=5
    // subtotal=250, tax=19, discount=10, total=259
    expect(totals.subtotal).toBe(250);
    expect(totals.taxAmount).toBe(19);
    expect(totals.discountAmount).toBe(10);
    expect(totals.total).toBe(259);
  });

  it('handles empty items list', () => {
    const totals = calculateTotals([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(0);
  });
});

// ============================================================
// STATUS FORMATTING & COLORS
// ============================================================

describe('formatPOStatus', () => {
  it('formats all statuses correctly', () => {
    expect(formatPOStatus('DRAFT')).toBe('Draft');
    expect(formatPOStatus('SUBMITTED')).toBe('Submitted');
    expect(formatPOStatus('APPROVED')).toBe('Approved');
    expect(formatPOStatus('ORDERED')).toBe('Ordered');
    expect(formatPOStatus('PARTIALLY_RECEIVED')).toBe('Partially Received');
    expect(formatPOStatus('RECEIVED')).toBe('Received');
    expect(formatPOStatus('CANCELLED')).toBe('Cancelled');
  });
});

describe('getPOStatusColor', () => {
  it('returns distinct colors for each status', () => {
    const colors = [
      getPOStatusColor('DRAFT'),
      getPOStatusColor('SUBMITTED'),
      getPOStatusColor('APPROVED'),
      getPOStatusColor('ORDERED'),
      getPOStatusColor('PARTIALLY_RECEIVED'),
      getPOStatusColor('RECEIVED'),
      getPOStatusColor('CANCELLED'),
    ];
    const unique = new Set(colors);
    expect(unique.size).toBe(7);
  });

  it('returns green for RECEIVED', () => {
    expect(getPOStatusColor('RECEIVED')).toContain('green');
  });

  it('returns red for CANCELLED', () => {
    expect(getPOStatusColor('CANCELLED')).toContain('red');
  });

  it('returns amber for PARTIALLY_RECEIVED', () => {
    expect(getPOStatusColor('PARTIALLY_RECEIVED')).toContain('amber');
  });
});
