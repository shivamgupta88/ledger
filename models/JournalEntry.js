const db = require('../config/database');

const createJournalEntry = async ({ date, narration, lines, reversesEntryId = null }) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert journal entry
    const entryQuery = `
      INSERT INTO journal_entries (date, narration, reverses_entry_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const entryResult = await client.query(entryQuery, [date, narration, reversesEntryId]);
    const entry = entryResult.rows[0];
    
    // Insert journal lines
    const insertedLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Get account ID by code
      const accountQuery = 'SELECT id FROM accounts WHERE code = $1';
      const accountResult = await client.query(accountQuery, [line.account_code]);
      
      if (!accountResult.rows[0]) {
        throw new Error(`Account with code ${line.account_code} not found`);
      }
      
      const accountId = accountResult.rows[0].id;
      
      const lineQuery = `
        INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents, line_index)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const lineResult = await client.query(lineQuery, [
        entry.id,
        accountId,
        line.debit || 0,
        line.credit || 0,
        i
      ]);
      
      insertedLines.push({
        ...lineResult.rows[0],
        account_code: line.account_code
      });
    }
    
    await client.query('COMMIT');
    
    return {
      ...entry,
      lines: insertedLines
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findJournalEntryById = async (id) => {
  const entryQuery = `
    SELECT je.*, 
           jl.id as line_id,
           jl.debit_cents,
           jl.credit_cents,
           jl.line_index,
           a.code as account_code,
           a.name as account_name
    FROM journal_entries je
    LEFT JOIN journal_lines jl ON je.id = jl.entry_id
    LEFT JOIN accounts a ON jl.account_id = a.id
    WHERE je.id = $1
    ORDER BY jl.line_index
  `;
  
  const result = await db.query(entryQuery, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const entry = {
    id: result.rows[0].id,
    date: result.rows[0].date,
    narration: result.rows[0].narration,
    posted_at: result.rows[0].posted_at,
    reverses_entry_id: result.rows[0].reverses_entry_id,
    lines: []
  };
  
  result.rows.forEach(row => {
    if (row.line_id) {
      entry.lines.push({
        id: row.line_id,
        account_code: row.account_code,
        account_name: row.account_name,
        debit: parseInt(row.debit_cents),
        credit: parseInt(row.credit_cents)
      });
    }
  });
  
  return entry;
};

const findAllJournalEntries = async (limit = 50, offset = 0) => {
  const query = `
    SELECT * FROM journal_entries 
    ORDER BY date DESC, id DESC 
    LIMIT $1 OFFSET $2
  `;
  
  const result = await db.query(query, [limit, offset]);
  return result.rows;
};

module.exports = {
  createJournalEntry,
  findJournalEntryById,
  findAllJournalEntries
};