const crypto = require('node:crypto');

/** Short, URL-safe unique id. Not a security token - just a primary key. */
function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = { newId };
