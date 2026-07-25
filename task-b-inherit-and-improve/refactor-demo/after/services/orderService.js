// services/orderService.js
// Business logic lives here, not in the route handler. It depends on an
// injected repository rather than importing a database connection
// directly, which is what makes it testable without a real database (see
// order.service.test.js).

const { calculateTotal } = require('./pricingService');
const { notifyOrderStatusChanged } = require('./notificationService');

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

class NotFoundError extends Error {}
class ValidationError extends Error {}

function makeOrderService(orderRepository) {
  return {
    async updateStatus(orderId, status) {
      if (!VALID_STATUSES.includes(status)) {
        throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      const order = await orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      const total = calculateTotal({
        subtotal: order.subtotal,
        customerType: order.customer_type,
        itemCount: order.item_count,
      });

      await orderRepository.updateStatusAndTotal(orderId, status, total);

      // Notification is fire-and-forget from the caller's perspective - it
      // cannot fail this operation.
      notifyOrderStatusChanged(order, status, total);

      return { orderId, status, total };
    },
  };
}

module.exports = { makeOrderService, NotFoundError, ValidationError, VALID_STATUSES };
