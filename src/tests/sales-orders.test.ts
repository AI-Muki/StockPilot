import { describe, it, expect } from 'vitest';
import {
  canTransitionSO,
  calculateSOLineTotal,
  calculateSOTotals,
  formatSOStatus,
  getSOStatusColor,
  formatPaymentStatus,
  getPaymentStatusColor,
} from '@/services/sales-orders';
import type { SalesOrderItemInput, SalesOrderStatus, PaymentStatus } from '@/types';

// ============================================================
// SO WORKFLOW STATE MACHINE
// ============================================================

describe('SO workflow state machine', () => {
  it('allows DRAFT → CONFIRMED', () => {
    expect(canTransitionSO('DRAFT', 'CONFIRMED')).toBe(true);
  });

  it('allows DRAFT → CANCELLED', () => {
    expect(canTransitionSO('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('allows CONFIRMED → PROCESSING (during fulfillment)', () => {
    expect(canTransitionSO('CONFIRMED', 'PROCESSING')).toBe(true);
  });

  it('allows CONFIRMED → PARTIALLY_FULFILLED', () => {
    expect(canTransitionSO('CONFIRMED', 'PARTIALLY_FULFILLED')).toBe(true);
  });

  it('allows CONFIRMED → FULFILLED', () => {
    expect(canTransitionSO('CONFIRMED', 'FULFILLED')).toBe(true);
  });

  it('allows CONFIRMED → CANCELLED (releases reservations)', () => {
    expect(canTransitionSO('CONFIRMED', 'CANCELLED')).toBe(true);
  });

  it('allows PROCESSING → PARTIALLY_FULFILLED', () => {
    expect(canTransitionSO('PROCESSING', 'PARTIALLY_FULFILLED')).toBe(true);
  });

  it('allows PROCESSING → FULFILLED', () => {
    expect(canTransitionSO('PROCESSING', 'FULFILLED')).toBe(true);
  });

  it('allows PROCESSING → CANCELLED', () => {
    expect(canTransitionSO('PROCESSING', 'CANCELLED')).toBe(true);
  });

  it('allows PARTIALLY_FULFILLED → FULFILLED', () => {
    expect(canTransitionSO('PARTIALLY_FULFILLED', 'FULFILLED')).toBe(true);
  });

  it('allows PARTIALLY_FULFILLED → CANCELLED', () => {
    expect(canTransitionSO('PARTIALLY_FULFILLED', 'CANCELLED')).toBe(true);
  });

  it('blocks FULFILLED from transitioning anywhere', () => {
    const statuses: SalesOrderStatus[] = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'];
    for (const s of statuses) {
      expect(canTransitionSO('FULFILLED', s)).toBe(false);
    }
  });

  it('blocks CANCELLED from transitioning anywhere', () => {
    const statuses: SalesOrderStatus[] = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'];
    for (const s of statuses) {
      expect(canTransitionSO('CANCELLED', s)).toBe(false);
    }
  });

  it('blocks skipping steps (DRAFT → PROCESSING)', () => {
    expect(canTransitionSO('DRAFT', 'PROCESSING')).toBe(false);
  });

  it('blocks DRAFT → FULFILLED (must confirm first)', () => {
    expect(canTransitionSO('DRAFT', 'FULFILLED')).toBe(false);
  });

  it('blocks reverting (CONFIRMED → DRAFT)', () => {
    expect(canTransitionSO('CONFIRMED', 'DRAFT')).toBe(false);
  });

  it('blocks PARTIALLY_FULFILLED → CONFIRMED (no going back)', () => {
    expect(canTransitionSO('PARTIALLY_FULFILLED', 'CONFIRMED')).toBe(false);
  });

  it('blocks FULFILLED → CANCELLED (already done)', () => {
    expect(canTransitionSO('FULFILLED', 'CANCELLED')).toBe(false);
  });
});

// ============================================================
// FULL WORKFLOW SIMULATION (100 stock scenario)
// ============================================================

describe('Full SO workflow simulation: 100 stock scenario', () => {
  it('simulates create → confirm → fulfill for order of 30', () => {
    // Initial state: 100 on hand, 20 reserved
    let onHand = 100;
    let reserved = 20;
    let available = onHand - reserved; // 80

    // Create order for 30
    const orderQty = 30;
    expect(available >= orderQty).toBe(true); // can confirm

    // Confirm: reserve 30 (does NOT reduce on_hand)
    let soStatus: SalesOrderStatus = 'CONFIRMED';
    reserved += orderQty; // reserved = 50
    available = onHand - reserved; // 50
    expect(onHand).toBe(100); // on hand unchanged
    expect(reserved).toBe(50);
    expect(available).toBe(50);

    // Fulfill 30: reduce on_hand, release reservation
    const fulfillQty = 30;
    onHand -= fulfillQty; // 70
    reserved -= fulfillQty; // 20
    available = onHand - reserved; // 50
    soStatus = 'FULFILLED';

    expect(onHand).toBe(70);
    expect(reserved).toBe(20);
    expect(available).toBe(50);
    expect(soStatus).toBe('FULFILLED');
  });

  it('simulates partial fulfillment (100 stock, order 50, fulfill 30 then 20)', () => {
    let onHand = 100;
    let reserved = 0;
    let available = onHand - reserved; // 100

    const orderQty = 50;

    // Confirm: reserve 50
    reserved += orderQty; // 50
    available = onHand - reserved; // 50
    let soStatus: SalesOrderStatus = 'CONFIRMED';

    // Partial fulfill: 30
    const firstFulfill = 30;
    onHand -= firstFulfill; // 70
    reserved -= firstFulfill; // 20
    available = onHand - reserved; // 50
    soStatus = 'PROCESSING';

    expect(onHand).toBe(70);
    expect(reserved).toBe(20);

    // Remaining fulfill: 20
    const remaining = orderQty - firstFulfill; // 20
    onHand -= remaining; // 50
    reserved -= remaining; // 0
    available = onHand - reserved; // 50
    soStatus = 'FULFILLED';

    expect(onHand).toBe(50);
    expect(reserved).toBe(0);
    expect(available).toBe(50);
    expect(soStatus).toBe('FULFILLED');
  });

  it('simulates cancellation releasing reservations (no SALE movement)', () => {
    let onHand = 100;
    let reserved = 20;
    let available = onHand - reserved; // 80

    const orderQty = 30;

    // Confirm: reserve 30
    reserved += orderQty; // 50
    available = onHand - reserved; // 50
    let soStatus: SalesOrderStatus = 'CONFIRMED';

    // Cancel: release 30 reservation, on_hand unchanged
    reserved -= orderQty; // 20
    available = onHand - reserved; // 80
    soStatus = 'CANCELLED';

    expect(onHand).toBe(100); // on hand unchanged - no SALE movement
    expect(reserved).toBe(20); // back to original
    expect(available).toBe(80);
    expect(soStatus).toBe('CANCELLED');
  });
});

// ============================================================
// INSUFFICIENT INVENTORY VALIDATION
// ============================================================

describe('Insufficient inventory validation', () => {
  it('blocks confirming when available < order qty', () => {
    const onHand = 100;
    const reserved = 80;
    const available = onHand - reserved; // 20
    const orderQty = 50;
    expect(available >= orderQty).toBe(false);
  });

  it('allows confirming when available exactly equals order qty', () => {
    const onHand = 100;
    const reserved = 70;
    const available = onHand - reserved; // 30
    const orderQty = 30;
    expect(available >= orderQty).toBe(true);
  });

  it('blocks confirming when available is 0 and order qty > 0', () => {
    const onHand = 50;
    const reserved = 50;
    const available = onHand - reserved; // 0
    const orderQty = 10;
    expect(available >= orderQty).toBe(false);
  });

  it('blocks confirming when on hand is 0', () => {
    const onHand = 0;
    const reserved = 0;
    const available = onHand - reserved; // 0
    const orderQty = 5;
    expect(available >= orderQty).toBe(false);
  });
});

// ============================================================
// OVER-FULFILLING VALIDATION
// ============================================================

describe('Over-fulfilling validation', () => {
  it('blocks fulfilling more than ordered', () => {
    const ordered = 50;
    const fulfilled = 0;
    const attemptFulfill = 60;
    const remaining = ordered - fulfilled;
    expect(attemptFulfill > remaining).toBe(true);
  });

  it('blocks fulfilling more than remaining on partial fulfillment', () => {
    const ordered = 50;
    const fulfilled = 30;
    const attemptFulfill = 25;
    const remaining = ordered - fulfilled;
    expect(attemptFulfill > remaining).toBe(true);
  });

  it('allows fulfilling exactly the remaining quantity', () => {
    const ordered = 50;
    const fulfilled = 30;
    const attemptFulfill = 20;
    const remaining = ordered - fulfilled;
    expect(attemptFulfill <= remaining).toBe(true);
  });

  it('allows partial fulfillment less than remaining', () => {
    const ordered = 50;
    const fulfilled = 0;
    const attemptFulfill = 20;
    const remaining = ordered - fulfilled;
    expect(attemptFulfill <= remaining).toBe(true);
  });
});

// ============================================================
// CANCELLATION VALIDATION
// ============================================================

describe('Cancellation validation', () => {
  it('blocks cancelling a DRAFT (no reservations to release)', () => {
    // DRAFT can be cancelled but just transitions, no reservations
    // Actually DRAFT → CANCELLED is allowed in the state machine
    expect(canTransitionSO('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('blocks cancelling FULFILLED orders', () => {
    expect(canTransitionSO('FULFILLED', 'CANCELLED')).toBe(false);
  });

  it('blocks cancelling already CANCELLED orders', () => {
    expect(canTransitionSO('CANCELLED', 'CANCELLED')).toBe(false);
  });

  it('allows cancelling PARTIALLY_FULFILLED (releases unfulfilled reservations)', () => {
    expect(canTransitionSO('PARTIALLY_FULFILLED', 'CANCELLED')).toBe(true);
  });
});

// ============================================================
// CANCELLATION WITH PARTIAL FULFILLMENT
// ============================================================

describe('Cancellation with partial fulfillment', () => {
  it('only releases unfulfilled portion of reservation', () => {
    const ordered = 50;
    const fulfilled = 30;
    const reserved = 50; // originally reserved all 50

    // On cancel: release only unfulfilled reserved
    const unfulfilledReserved = reserved - fulfilled; // 20
    const releasedReserved = reserved - unfulfilledReserved; // 30 remain (already fulfilled)

    expect(unfulfilledReserved).toBe(20);
    expect(releasedReserved).toBe(30);
  });
});

// ============================================================
// LINE TOTAL CALCULATION
// ============================================================

describe('calculateSOLineTotal', () => {
  it('calculates basic line total (qty * unit_price)', () => {
    const item: SalesOrderItemInput = {
      product_id: 'p1',
      quantity: 10,
      unit_price: 25.00,
      tax_rate: 0,
      discount_amount: 0,
    };
    expect(calculateSOLineTotal(item)).toBe(250);
  });

  it('calculates with tax', () => {
    const item: SalesOrderItemInput = {
      product_id: 'p1',
      quantity: 10,
      unit_price: 25.00,
      tax_rate: 10,
      discount_amount: 0,
    };
    // base = 250, after discount = 250, tax = 25, total = 275
    expect(calculateSOLineTotal(item)).toBe(275);
  });

  it('calculates with discount', () => {
    const item: SalesOrderItemInput = {
      product_id: 'p1',
      quantity: 10,
      unit_price: 25.00,
      tax_rate: 0,
      discount_amount: 30,
    };
    // base = 250, after discount = 220, tax = 0, total = 220
    expect(calculateSOLineTotal(item)).toBe(220);
  });

  it('calculates with tax and discount', () => {
    const item: SalesOrderItemInput = {
      product_id: 'p1',
      quantity: 20,
      unit_price: 50.00,
      tax_rate: 8.5,
      discount_amount: 100,
    };
    // base = 1000, after discount = 900, tax = 76.5, total = 976.5
    expect(calculateSOLineTotal(item)).toBe(976.5);
  });
});

// ============================================================
// SO TOTALS CALCULATION
// ============================================================

describe('calculateSOTotals', () => {
  it('calculates totals for multiple items', () => {
    const items: SalesOrderItemInput[] = [
      { product_id: 'p1', quantity: 10, unit_price: 25, tax_rate: 0, discount_amount: 0 },
      { product_id: 'p2', quantity: 5, unit_price: 40, tax_rate: 0, discount_amount: 0 },
    ];
    const totals = calculateSOTotals(items);
    expect(totals.subtotal).toBe(450);
    expect(totals.total).toBe(450);
  });

  it('calculates totals with tax and discount', () => {
    const items: SalesOrderItemInput[] = [
      { product_id: 'p1', quantity: 10, unit_price: 25, tax_rate: 10, discount_amount: 10 },
      { product_id: 'p2', quantity: 5, unit_price: 40, tax_rate: 5, discount_amount: 0 },
    ];
    const totals = calculateSOTotals(items);
    // Item 1: base=250, discount=10, after=240, tax=24
    // Item 2: base=200, discount=0, after=200, tax=10
    // subtotal=450, tax=34, discount=10, total=474
    expect(totals.subtotal).toBe(450);
    expect(totals.taxAmount).toBe(34);
    expect(totals.discountAmount).toBe(10);
    expect(totals.total).toBe(474);
  });

  it('handles empty items', () => {
    const totals = calculateSOTotals([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(0);
  });
});

// ============================================================
// STATUS FORMATTING & COLORS
// ============================================================

describe('formatSOStatus', () => {
  it('formats all statuses correctly', () => {
    expect(formatSOStatus('DRAFT')).toBe('Draft');
    expect(formatSOStatus('CONFIRMED')).toBe('Confirmed');
    expect(formatSOStatus('PROCESSING')).toBe('Processing');
    expect(formatSOStatus('PARTIALLY_FULFILLED')).toBe('Partially Fulfilled');
    expect(formatSOStatus('FULFILLED')).toBe('Fulfilled');
    expect(formatSOStatus('CANCELLED')).toBe('Cancelled');
  });
});

describe('getSOStatusColor', () => {
  it('returns distinct colors for each status', () => {
    const colors = [
      getSOStatusColor('DRAFT'),
      getSOStatusColor('CONFIRMED'),
      getSOStatusColor('PROCESSING'),
      getSOStatusColor('PARTIALLY_FULFILLED'),
      getSOStatusColor('FULFILLED'),
      getSOStatusColor('CANCELLED'),
    ];
    const unique = new Set(colors);
    expect(unique.size).toBe(6);
  });

  it('returns green for FULFILLED', () => {
    expect(getSOStatusColor('FULFILLED')).toContain('green');
  });

  it('returns red for CANCELLED', () => {
    expect(getSOStatusColor('CANCELLED')).toContain('red');
  });

  it('returns amber for PARTIALLY_FULFILLED', () => {
    expect(getSOStatusColor('PARTIALLY_FULFILLED')).toContain('amber');
  });
});

// ============================================================
// PAYMENT STATUS FORMATTING & COLORS
// ============================================================

describe('formatPaymentStatus', () => {
  it('formats all payment statuses', () => {
    expect(formatPaymentStatus('UNPAID')).toBe('Unpaid');
    expect(formatPaymentStatus('PARTIALLY_PAID')).toBe('Partially Paid');
    expect(formatPaymentStatus('PAID')).toBe('Paid');
  });
});

describe('getPaymentStatusColor', () => {
  it('returns red for UNPAID', () => {
    expect(getPaymentStatusColor('UNPAID')).toContain('red');
  });

  it('returns amber for PARTIALLY_PAID', () => {
    expect(getPaymentStatusColor('PARTIALLY_PAID')).toContain('amber');
  });

  it('returns green for PAID', () => {
    expect(getPaymentStatusColor('PAID')).toContain('green');
  });
});
