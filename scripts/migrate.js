const db = require('../config/database');

async function runMigrations() {
  try {
    console.log('Starting migrations...');
    
    const schema = `

      CREATE TABLE IF NOT EXISTS api_keys (
          key VARCHAR(255) PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          narration TEXT NOT NULL,
          posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reverses_entry_id INTEGER REFERENCES journal_entries(id)
      );

      CREATE TABLE IF NOT EXISTS journal_lines (
          id SERIAL PRIMARY KEY,
          entry_id INTEGER NOT NULL REFERENCES journal_entries(id),
          account_id INTEGER NOT NULL REFERENCES accounts(id),
          debit_cents BIGINT NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
          credit_cents BIGINT NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
          line_index INTEGER NOT NULL,
          CONSTRAINT check_debit_or_credit CHECK (
              (debit_cents > 0 AND credit_cents = 0) OR 
              (debit_cents = 0 AND credit_cents > 0)
          )
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
          key VARCHAR(255) PRIMARY KEY,
          request_hash VARCHAR(255) NOT NULL,
          entry_id INTEGER REFERENCES journal_entries(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(entry_id);
      CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
      CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
      CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
    `;
    
    await db.query(schema);
    
    console.log('Database migrations completed');
    
    const apiKey = process.env.API_KEY || 'default-api-key';
    await db.query(
      'INSERT INTO api_keys (key) VALUES ($1) ON CONFLICT (key) DO NOTHING',
      [apiKey]
    );
    
    console.log('API key setup completed');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;