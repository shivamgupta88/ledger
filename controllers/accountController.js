const { 
  createAccount, 
  findAllAccounts, 
  findAccountByCode,
  getAccountBalance 
} = require('../models/Account');
const { validateAccount } = require('../utils/validation');

const createAccountHandler = async (req, res) => {
  try {
    // Validate request body
    const { isValid, error, value } = validateAccount(req.body);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error
      });
    }

    // Check if account with this code already exists
    const existingAccount = await findAccountByCode(value.code);
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: 'Account with this code already exists',
        error: `Account code ${value.code} is already in use`
      });
    }

    // Create new account
    const newAccount = await createAccount(value);
    
    console.log(`Account created: ${newAccount.code} - ${newAccount.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: newAccount.id,
        code: newAccount.code,
        name: newAccount.name,
        type: newAccount.type,
        created_at: newAccount.created_at
      }
    });

  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error.message
    });
  }
};

const getAllAccountsHandler = async (req, res) => {
  try {
    const { type } = req.query;
    
    // Validate account type if provided
    if (type && !['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account type',
        error: 'Invalid account type'
      });
    }

    const accounts = await findAllAccounts(type);
    
    res.status(200).json({
      success: true,
      message: type ? `${type} accounts retrieved successfully` : 'All accounts retrieved successfully',
      data: {
        accounts: accounts,
        count: accounts.length,
        filter: type || 'all'
      }
    });

  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching accounts',
      error: error.message
    });
  }
};

const getAccountBalanceHandler = async (req, res) => {
  try {
    const { code } = req.params;
    const { as_of } = req.query;
    
    // Validate account code
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Account code is required'
      });
    }

    // Validate as_of date format if provided
    let asOfDate = null;
    if (as_of) {
      asOfDate = new Date(as_of);
      if (isNaN(asOfDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for as_of parameter',
          error: 'Date should be in YYYY-MM-DD format'
        });
      }
      
      // Check if date is not in future
      if (asOfDate > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'as_of date cannot be in the future'
        });
      }
    }

    const balance = await getAccountBalance(code, as_of);
    
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
        error: `No account found with code: ${code}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Balance retrieved for account ${code}`,
      data: {
        account_code: balance.code,
        account_name: balance.name,
        account_type: balance.type,
        balance: balance.balance,
        total_debits: balance.total_debits,
        total_credits: balance.total_credits,
        as_of_date: as_of || 'current',
        balance_in_major_units: (balance.balance / 100).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching balance',
      error: error.message
    });
  }
};

module.exports = {
  createAccountHandler,
  getAllAccountsHandler,
  getAccountBalanceHandler
};