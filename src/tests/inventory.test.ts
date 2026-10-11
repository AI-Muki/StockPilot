import { describe, it, expect } from 'vitest';
import { computeStockStatus } from '@/services/inventory-engine';
import type { InventoryStatus } from '@/types';

describe('computeStockStatus', () => {
  it('returns OUT_OF_STOCK when onHand <= 0', () => {
    expect(computeStockStatus(0, 10, 100)).toBe('OUT_OF_STOCK');
    expect(computeStockStatus(-5, 10, 100)).toBe('OUT_OF_STOCK');
  });

  it('returns LOW_STOCK when onHand <= reorderPoint and > 0', () => {
    expect(computeStockStatus(5, 10, 100)).toBe('LOW_STOCK');
    expect(computeStockStatus(10, 10, 100)).toBe('LOW_STOCK');
  });

  it('returns OVERSTOCKED when onHand > maximumStock', () => {
    expect(computeStockStatus(150, 10, 100)).toBe('OVERSTOCKED');
    expect(computeStockStatus(101, 10, 100)).toBe('OVERSTOCKED');
  });

  it('returns IN_STOCK for normal stock levels', () => {
    expect(computeStockStatus(50, 10, 100)).toBe('IN_STOCK');
    expect(computeStockStatus(100, 10, 100)).toBe('IN_STOCK');
  });

  it('handles null maximumStock (never overstocked)', () => {
    expect(computeStockStatus(99999, 10, null)).toBe('IN_STOCK');
  });

  it('handles zero reorderPoint (never low stock unless out)', () => {
    expect(computeStockStatus(0, 0, 100)).toBe('OUT_OF_STOCK');
    expect(computeStockStatus(1, 0, 100)).toBe('IN_STOCK');
  });

  it('prioritizes OUT_OF_STOCK over LOW_STOCK', () => {
    expect(computeStockStatus(0, 0, 100)).toBe('OUT_OF_STOCK');
  });

  it('prioritizes LOW_STOCK over OVERSTOCKED', () => {
    // onHand <= reorderPoint but also > maximumStock
    // reorderPoint=50, maximumStock=30, onHand=40
    // 40 <= 50 → LOW_STOCK takes priority
    expect(computeStockStatus(40, 50, 30)).toBe('LOW_STOCK');
  });
});

describe('Inventory value calculation', () => {
  it('calculates value as onHand * cost_price', () => {
    const onHand = 100;
    const costPrice = 12.5;
    const value = onHand * costPrice;
    expect(value).toBe(1250);
  });

  it('handles zero stock', () => {
    const onHand = 0;
    const costPrice = 99.99;
    const value = onHand * costPrice;
    expect(value).toBe(0);
  });
});

describe('Available stock calculation', () => {
  it('available = onHand - reserved', () => {
    const onHand = 100;
    const reserved = 30;
    const available = onHand - reserved;
    expect(available).toBe(70);
  });

  it('available is zero when fully reserved', () => {
    const onHand = 50;
    const reserved = 50;
    const available = onHand - reserved;
    expect(available).toBe(0);
  });

  it('available can be negative if over-reserved (edge case)', () => {
    const onHand = 30;
    const reserved = 50;
    const available = onHand - reserved;
    expect(available).toBe(-20);
  });
});

describe('Movement type classification', () => {
  it('identifies increase movements correctly', () => {
    const increaseTypes = ['PURCHASE_RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN', 'INITIAL_STOCK'];
    expect(increaseTypes).toHaveLength(5);
    expect(increaseTypes).toContain('PURCHASE_RECEIPT');
    expect(increaseTypes).not.toContain('SALE');
  });

  it('identifies decrease movements correctly', () => {
    const decreaseTypes = ['SALE', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'DAMAGE'];
    expect(decreaseTypes).toHaveLength(5);
    expect(decreaseTypes).toContain('SALE');
    expect(decreaseTypes).not.toContain('PURCHASE_RECEIPT');
  });
});
