const express = require('express');
const router = express.Router();
const { 
  createJournalEntryHandler, 
  getJournalEntryHandler, 
  getAllJournalEntriesHandler 
} = require('../controllers/journalEntryController');

// POST /api/journal-entries - Create and post new journal entry (with idempotency)
router.post('/', createJournalEntryHandler);

// GET /api/journal-entries/:id - Get specific journal entry
router.get('/:id', getJournalEntryHandler);

// GET /api/journal-entries - List all journal entries (paginated)
router.get('/', getAllJournalEntriesHandler);

module.exports = router;