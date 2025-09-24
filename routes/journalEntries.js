const express = require('express');
const router = express.Router();
const { 
  createJournalEntryHandler, 
  getJournalEntryHandler, 
  getAllJournalEntriesHandler 
} = require('../controllers/journalEntryController');

router.post('/', createJournalEntryHandler);

router.get('/:id', getJournalEntryHandler);

router.get('/', getAllJournalEntriesHandler);

module.exports = router;