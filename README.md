# Ledger API : https://ledger-4da8.onrender.com

REST API for double-entry bookkeeping with account management and transaction recording.

## Overview

Double-entry accounting system where each transaction affects at least two accounts. Debits must equal credits.

## Features

- Immutable journal entries
- Account balance tracking
- Automatic idempotency protection
- Transaction history
- Multiple account types (Assets, Liabilities, Equity, Revenue, Expenses)

## Quick Start

### Prerequisites
- Node.js v16+
- PostgreSQL
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```bash
# Database Connection
DATABASE_URL=""

# API Configuration
API_KEY=my-secure-api-key-123
PORT=3000
NODE_ENV=development

# Individual DB components (keeping for reference)
DB_USER=avnadmin
DB_PASSWORD=""
DB_HOST=""
DB_PORT=23649
DB_NAME=defaultdb
DB_CA_CERT="""
```

3. Create database tables:
```bash
npm run migrate
```

4. Start the server:
```bash
npm run dev
```

The server will be available at `http://localhost:3000`

### Verify Installation

Test the health endpoint:
```bash
curl http://localhost:3000/health
curl https://ledger-4da8.onrender.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-01-15T10:30:00.000Z"}
```

## API Documentation

Full API documentation is in [API_DOCS.md](./API_DOCS.md).

### Examples

Create an account:
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"code": "1001", "name": "Cash", "type": "Asset"}'
```

Record a transaction:
```bash
curl -X POST http://localhost:3000/api/journal-entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "date": "2025-01-15",
    "narration": "Initial capital investment",
    "lines": [
      {"account_code": "1001", "debit": 10000000},
      {"account_code": "3001", "credit": 10000000}
    ]
  }'
```

Check account balance:
```bash
curl -H "x-api-key: your-api-key-here" \
  http://localhost:3000/api/accounts/1001/balance
```

## Test Scenario

The system includes a complete test scenario based on typical business transactions:

### 1. Create Chart of Accounts
```bash
# Asset accounts
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"code": "1001", "name": "Cash", "type": "Asset"}'

curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"code": "1002", "name": "Bank", "type": "Asset"}'

# Equity account  
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"code": "3001", "name": "Capital", "type": "Equity"}'

# Revenue account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"code": "4001", "name": "Sales", "type": "Revenue"}'

# Expense account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"code": "5001", "name": "Rent", "type": "Expense"}'
```

### 2. Record Business Transactions

Initial investment:
```bash
curl -X POST http://localhost:3000/api/journal-entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "date": "2025-01-01",
    "narration": "Seed capital investment",
    "lines": [
      {"account_code": "1001", "debit": 10000000},
      {"account_code": "3001", "credit": 10000000}
    ]
  }'
```

Cash sale:
```bash
curl -X POST http://localhost:3000/api/journal-entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "date": "2025-01-05",
    "narration": "Cash sale to customer",
    "lines": [
      {"account_code": "1001", "debit": 5000000},
      {"account_code": "4001", "credit": 5000000}
    ]
  }'
```

Rent payment:
```bash
curl -X POST http://localhost:3000/api/journal-entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "date": "2025-01-07",
    "narration": "Office rent payment for January",
    "lines": [
      {"account_code": "5001", "debit": 2000000},
      {"account_code": "1001", "credit": 2000000}
    ]
  }'
```

### 3. Expected Results

After running the test scenario:
- **Cash balance**: ₹130,000.00 (13000000 minor units)
- **Sales balance**: -₹50,000.00 (-5000000 minor units, credit normal)
- **Rent expense**: ₹20,000.00 (2000000 minor units)
- **Capital balance**: -₹100,000.00 (-10000000 minor units, credit normal)

## Architecture

### Database Tables
- accounts: Chart of accounts
- journal_entries: Transaction headers
- journal_lines: Individual debit/credit entries
- idempotency_keys: Duplicate prevention

### Notes
- Amounts in minor units (cents)
- Entries are immutable once posted
- Real-time balance calculation
- Automatic duplicate prevention

## Error Responses

- 400: Validation errors
- 401: Invalid API key
- 404: Resource not found
- 409: Duplicate codes
- 500: Server errors

## Security

- API key authentication required
- Parameterized SQL queries
- Input validation with Joi
- Database constraints

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run migrate` - Create database tables and indexes

## Project Structure

```
ledger/
├── config/
│   └── database.js          # PostgreSQL connection
├── controllers/
│   ├── accountController.js  # Account CRUD operations
│   └── journalEntryController.js # Journal entry operations
├── models/
│   ├── Account.js           # Account data access functions
│   └── JournalEntry.js      # Journal entry data access functions
├── routes/
│   ├── accounts.js          # Account API routes
│   └── journalEntries.js    # Journal entry API routes
├── scripts/
│   └── migrate.js           # Database migration script
├── utils/
│   ├── idempotency.js       # Idempotency key handling
│   └── validation.js        # Request validation schemas
├── .env                     # Environment variables
├── index.js                 # Express server setup
└── API_DOCS.md             # Complete API documentation
```

## Contributing

1. Ensure all journal entries balance (debits = credits)
2. Add input validation for new endpoints
3. Include error handling
4. Update documentation for new features

## License

MIT License - see LICENSE file for details
