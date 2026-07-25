// routes/orders.js
// This is representative of what the brief describes: business logic living
// inside the route handler, direct database calls with string-built SQL,
// and a secret committed to the repo. Written for this exercise; not lifted
// from a real client.

const express = require('express');
const router = express.Router();
const db = require('../db'); // raw mysql2 connection, exported directly
const nodemailer = require('nodemailer');

// Hardcoded credentials, committed straight into source control.
const MAIL_USER = 'orders@acmeshop.com';
const MAIL_PASS = 'Sup3rSecret!2019';
const DISCOUNT_API_KEY = 'sk_live_4f9a2c11b8e77d0031f9';

router.post('/orders/:id/status', (req, res) => {
  const orderId = req.params.id;
  const newStatus = req.body.status;

  // Business logic mixed into the handler: recalculating totals here,
  // rather than in a single place the rest of the app can trust.
  db.query(
    `SELECT * FROM orders WHERE id = ${orderId}`, // string-built SQL -> SQL injection
    (err, rows) => {
      if (err) {
        console.log(err); // swallowed - caller gets a raw 500 with no context
        return res.sendStatus(500);
      }

      const order = rows[0];
      if (!order) {
        return res.sendStatus(404);
      }

      // Discount logic re-implemented here instead of calling a shared
      // pricing function used at checkout - the two have already drifted
      // (checkout applies free shipping over $50, this does not).
      let total = order.subtotal;
      if (order.customer_type === 'vip') {
        total = total * 0.9;
      }
      if (order.item_count > 10) {
        total = total - 5;
      }

      db.query(
        `UPDATE orders SET status = '${newStatus}', total = ${total} WHERE id = ${orderId}`,
        (err2) => {
          if (err2) {
            console.log(err2);
            return res.sendStatus(500);
          }

          // Fire off an email inline, with no retry, no queue, and secrets
          // read from constants above instead of environment config. If
          // this throws, the status update has already committed but the
          // customer never finds out, and the client gets a 500 for a
          // request that actually "succeeded."
          const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: MAIL_USER, pass: MAIL_PASS },
          });
          transport.sendMail({
            from: MAIL_USER,
            to: order.customer_email,
            subject: 'Order update',
            text: `Your order ${orderId} is now ${newStatus}. Total: $${total}`,
          });

          // No validation anywhere above that `newStatus` is one of a known
          // set of values - a typo or a malicious client can set any string.
          res.json({ ok: true, total });
        }
      );
    }
  );
});

module.exports = router;
