const db = require('../config/database');

const createAccount = async ({ code, name, type }) => {
  const query = `
    INSERT INTO accounts (code, name, type) 
    VALUES ($1, $2, $3) 
    RETURNING *
  `;
  const result = await db.query(query, [code, name, type]);
  return result.rows[0];
};

const findAllAccounts = async (type = null) => {
  let query = 'SELECT * FROM accounts';
  let params = [];
  
  if (type) {
    query += ' WHERE type = $1';
    params.push(type);
  }
  
  query += ' ORDER BY code';
  
  const result = await db.query(query, params);
  return result.rows;
};

const findAccountByCode = async (code) => {
  const query = 'SELECT * FROM accounts WHERE code = $1';
  const result = await db.query(query, [code]);
  return result.rows[0];
};

const findAccountById = async (id) => {
  const query = 'SELECT * FROM accounts WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
};

const getAccountBalance = async (accountCode, asOfDate = null) => {
  let query = `
    SELECT 
      a.code,
      a.name,
      a.type,
      COALESCE(SUM(jl.debit_cents), 0) as total_debits,
      COALESCE(SUM(jl.credit_cents), 0) as total_credits
    FROM accounts a
    LEFT JOIN journal_lines jl ON a.id = jl.account_id
    LEFT JOIN journal_entries je ON jl.entry_id = je.id
    WHERE a.code = $1
  `;
  
  const params = [accountCode];
  
  if (asOfDate) {
    query += ' AND je.date <= $2';
    params.push(asOfDate);
  }
  
  query += ' GROUP BY a.id, a.code, a.name, a.type';
  
  const result = await db.query(query, params);
  const row = result.rows[0];
  
  if (!row) {
    return null;
  }

  const totalDebits = parseInt(row.total_debits);
  const totalCredits = parseInt(row.total_credits);

  let balance;
  if (['Asset', 'Expense'].includes(row.type)) {
    balance = totalDebits - totalCredits;
  } else {
    balance = totalCredits - totalDebits;
  }

  return {
    code: row.code,
    name: row.name,
    type: row.type,
    balance: balance,
    total_debits: totalDebits,
    total_credits: totalCredits
  };
};

module.exports = {
  createAccount,
  findAllAccounts,
  findAccountByCode,
  findAccountById,
  getAccountBalance
};