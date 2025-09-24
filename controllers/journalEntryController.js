const { 
  createJournalEntry, 
  findJournalEntryById, 
  findAllJournalEntries 
} = require('../models/JournalEntry.js');
const { validateJournalEntry } = require('../utils/validation');
const { handleIdempotency, storeIdempotencyKey } = require('../utils/idempotency');

const createJournalEntryHandler = async (req, res) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] ||
      `auto-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const { isValid, error, existingEntry, requestHash } = await handleIdempotency(
      idempotencyKey, 
      req.body
    );
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency error',
        error: error
      });
    }

    if (existingEntry) {
      console.log(`Returning existing entry for idempotency key: ${idempotencyKey}`);
      return res.status(200).json({
        success: true,
        message: 'Entry already exists (idempotent)',
        data: existingEntry,
        idempotent: true
      });
    }

    const validation = validateJournalEntry(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validation.error
      });
    }

    const { date, narration, lines, reverses_entry_id } = validation.value;

    const newEntry = await createJournalEntry({
      date,
      narration,
      lines,
      reversesEntryId: reverses_entry_id
    });

    await storeIdempotencyKey(idempotencyKey, requestHash, newEntry.id);

    console.log(`Journal entry created: ID ${newEntry.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Journal entry created',
      data: {
        id: newEntry.id,
        date: newEntry.date,
        narration: newEntry.narration,
        posted_at: newEntry.posted_at,
        reverses_entry_id: newEntry.reverses_entry_id,
        lines: newEntry.lines.map(line => ({
          account_code: line.account_code,
          debit: line.debit_cents,
          credit: line.credit_cents,
          debit_major: (line.debit_cents / 100).toFixed(2),
          credit_major: (line.credit_cents / 100).toFixed(2)
        }))
      },
      idempotent: false
    });

  } catch (error) {
    console.error('Error creating journal entry:', error);

    if (error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account reference',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating journal entry',
      error: error.message
    });
  }
};

const getJournalEntryHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const entryId = parseInt(id);
    if (isNaN(entryId) || entryId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid journal entry ID',
        error: 'ID must be a positive integer'
      });
    }

    const entry = await findJournalEntryById(entryId);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Journal entry not found',
        error: `No journal entry found with ID: ${entryId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Journal entry retrieved successfully',
      data: {
        id: entry.id,
        date: entry.date,
        narration: entry.narration,
        posted_at: entry.posted_at,
        reverses_entry_id: entry.reverses_entry_id,
        lines: entry.lines.map(line => ({
          account_code: line.account_code,
          account_name: line.account_name,
          debit: line.debit,
          credit: line.credit,
          debit_major: (line.debit / 100).toFixed(2),
          credit_major: (line.credit / 100).toFixed(2)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching journal entry',
      error: error.message
    });
  }
};

const getAllJournalEntriesHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter',
        error: 'Limit must be between 1 and 100'
      });
    }
    
    if (offset < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offset parameter',
        error: 'Offset must be non-negative'
      });
    }

    const entries = await findAllJournalEntries(limit, offset);
    
    res.status(200).json({
      success: true,
      message: 'Journal entries retrieved successfully',
      data: {
        entries: entries,
        count: entries.length,
        pagination: {
          limit: limit,
          offset: offset,
          has_more: entries.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching journal entries',
      error: error.message
    });
  }
};

module.exports = {
  createJournalEntryHandler,
  getJournalEntryHandler,
  getAllJournalEntriesHandler
};