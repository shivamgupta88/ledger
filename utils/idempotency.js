const crypto = require('crypto');
const db = require('../config/database');

const generateRequestHash = (requestBody) => {
  return crypto.createHash('sha256')
    .update(JSON.stringify(requestBody))
    .digest('hex');
};

const checkIdempotencyKey = async (idempotencyKey) => {
  const query = 'SELECT * FROM idempotency_keys WHERE key = $1';
  const result = await db.query(query, [idempotencyKey]);
  return result.rows[0];
};

const storeIdempotencyKey = async (idempotencyKey, requestHash, entryId = null) => {
  const query = `
    INSERT INTO idempotency_keys (key, request_hash, entry_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await db.query(query, [idempotencyKey, requestHash, entryId]);
  return result.rows[0];
};

const handleIdempotency = async (idempotencyKey, requestBody) => {
  if (!idempotencyKey) {
    return { isValid: true, existingEntry: null };
  }

  const requestHash = generateRequestHash(requestBody);
  const existingKey = await checkIdempotencyKey(idempotencyKey);

  if (existingKey) {
    // Check if request body matches
    if (existingKey.request_hash !== requestHash) {
      return { 
        isValid: false, 
        error: 'Idempotency key used with different request body' 
      };
    }

    // Return existing entry if it exists
    if (existingKey.entry_id) {
      const { findJournalEntryById } = require('../models/JournalEntry');
      const existingEntry = await findJournalEntryById(existingKey.entry_id);
      return { isValid: true, existingEntry };
    }
  }

  return { isValid: true, existingEntry: null, requestHash };
};

module.exports = {
  generateRequestHash,
  checkIdempotencyKey,
  storeIdempotencyKey,
  handleIdempotency
};