// services/notificationService.js
// Emitting an event instead of sending mail inline means a slow or failing
// mail provider can never turn a successful order update into a 500, and
// failures can be retried by a worker instead of silently dropped.

const { EventEmitter } = require('node:events');

const events = new EventEmitter();

function notifyOrderStatusChanged(order, status, total) {
  events.emit('order.status_changed', { order, status, total });
}

// A worker process (or, for this exercise, this same process) subscribes
// and does the actual send, with its own retry/backoff policy - not shown
// here, out of scope for the refactor demo itself.
function onOrderStatusChanged(handler) {
  events.on('order.status_changed', handler);
}

module.exports = { notifyOrderStatusChanged, onOrderStatusChanged };
