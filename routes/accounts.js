const express = require('express');
const router = express.Router();
const { 
  createAccountHandler, 
  getAllAccountsHandler, 
  getAccountBalanceHandler 
} = require('../controllers/accountController');

router.post('/', createAccountHandler);

router.get('/', getAllAccountsHandler);

router.get('/:code/balance', getAccountBalanceHandler);

module.exports = router;