// middleware/errorHandler.js
// One place decides how a domain error becomes an HTTP response, so every
// route gets consistent status codes and messages instead of each handler
// guessing (or, as in the original, swallowing the error and returning a
// bare 500 with no explanation).

const { NotFoundError, ValidationError } = require('../services/orderService');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: 'validation_error', message: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: 'not_found', message: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'internal_error', message: 'Something went wrong.' });
}

module.exports = { errorHandler };
