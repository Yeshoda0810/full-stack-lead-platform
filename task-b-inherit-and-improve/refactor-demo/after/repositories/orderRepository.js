// repositories/orderRepository.js
// The only file in the app allowed to write SQL. Every query is
// parameterized - there is no path from user input to a query string.

function makeOrderRepository(db) {
  return {
    async findById(orderId) {
      const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      return rows[0] || null;
    },

    async updateStatusAndTotal(orderId, status, total) {
      await db.query('UPDATE orders SET status = ?, total = ? WHERE id = ?', [status, total, orderId]);
    },
  };
}

module.exports = { makeOrderRepository };
