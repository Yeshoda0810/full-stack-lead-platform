// services/pricingService.js
// One place order totals get computed, so checkout and every other caller
// (like an order-status update) can never drift apart the way they had in
// the version this replaces.

const VIP_DISCOUNT = 0.9;
const BULK_DISCOUNT_THRESHOLD = 10;
const BULK_DISCOUNT_AMOUNT = 5;
const FREE_SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 4.99;

function calculateTotal(order) {
  let total = order.subtotal;

  if (order.customerType === 'vip') {
    total *= VIP_DISCOUNT;
  }
  if (order.itemCount > BULK_DISCOUNT_THRESHOLD) {
    total -= BULK_DISCOUNT_AMOUNT;
  }
  if (total < FREE_SHIPPING_THRESHOLD) {
    total += SHIPPING_COST;
  }

  return Math.max(Math.round(total * 100) / 100, 0);
}

module.exports = { calculateTotal };
