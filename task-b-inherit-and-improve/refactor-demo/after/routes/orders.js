// routes/orders.js
// The handler's only job is HTTP: parse the request, call the service,
// shape the response. No SQL, no pricing math, no mail credentials in
// sight - all three moved to layers that don't know Express exists.

const express = require('express');
const { NotFoundError, ValidationError } = require('../services/orderService');

function makeOrdersRouter(orderService) {
  const router = express.Router();

  router.post('/orders/:id/status', async (req, res, next) => {
    try {
      const result = await orderService.updateStatus(req.params.id, req.body.status);
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err); // handled once, centrally - see middleware/errorHandler.js
    }
  });

  return router;
}

module.exports = { makeOrdersRouter };
