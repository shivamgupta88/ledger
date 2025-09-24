const express = require('express');
const router = express.Router();
const { 
  createAccountHandler, 
  getAllAccountsHandler, 
  getAccountBalanceHandler 
} = require('../controllers/accountController');

// POST /api/accounts - Create new account
router.post('/', createAccountHandler);

// GET /api/accounts - List all accounts (with optional type filter)
router.get('/', getAllAccountsHandler);

// GET /api/accounts/:code/balance - Get account balance
router.get('/:code/balance', getAccountBalanceHandler);

module.exports = router;