# API Documentation

Double-entry bookkeeping REST API.

## Base URL
```
http://localhost:3000/api
```

## Authentication

All endpoints require an API key:

```http
x-api-key: your-api-key-here
```

```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/api/accounts
```

---

## Accounts

### Create Account

Create a new account.

**Endpoint:** `POST /accounts`

Request:
```json
{
  "code": "1001",
  "name": "Cash",
  "type": "Asset"
}
```

Parameters:
- `code` (string, required): Unique account code (max 20 characters)
- `name` (string, required): Account name (max 255 characters)  
- `type` (string, required): Account type - one of: `Asset`, `Liability`, `Equity`, `Revenue`, `Expense`

Example:
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secure-api-key-123" \
  -d '{
    "code": "1001",
    "name": "Cash", 
    "type": "Asset"
  }'
```

Response (201):
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": 1,
    "code": "1001",
    "name": "Cash",
    "type": "Asset",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

Error (409):
```json
{
  "success": false,
  "message": "Account with this code already exists",
  "error": "Account code 1001 is already in use"
}
```

### List Accounts

Get all accounts with optional type filter.

**Endpoint:** `GET /accounts`

Query Parameters:
- `type` (optional): Filter by account type

Examples:
```bash
# Get all accounts
curl -H "x-api-key: my-secure-api-key-123" \
  http://localhost:3000/api/accounts

# Get only Asset accounts
curl -H "x-api-key: my-secure-api-key-123" \
  "http://localhost:3000/api/accounts?type=Asset"
```

Response (200):
```json
{
  "success": true,
  "message": "All accounts retrieved successfully",
  "data": {
    "accounts": [
      {
        "id": 1,
        "code": "1001",
        "name": "Cash",
        "type": "Asset",
        "created_at": "2025-01-15T10:30:00.000Z"
      },
      {
        "id": 2,
        "code": "3001", 
        "name": "Capital",
        "type": "Equity",
        "created_at": "2025-01-15T10:31:00.000Z"
      }
    ],
    "count": 2,
    "filter": "all"
  }
}
```

### Get Account Balance

Get account balance with optional historical date.

**Endpoint:** `GET /accounts/{code}/balance`

Parameters:
- `code` (required): Account code

Query Parameters:
- `as_of` (optional): Date in YYYY-MM-DD format for historical balance

Examples:
```bash
# Current balance
curl -H "x-api-key: my-secure-api-key-123" \
  http://localhost:3000/api/accounts/1001/balance

# Balance as of specific date
curl -H "x-api-key: my-secure-api-key-123" \
  "http://localhost:3000/api/accounts/1001/balance?as_of=2025-01-31"
```

Response (200):
```json
{
  "success": true,
  "message": "Balance retrieved for account 1001",
  "data": {
    "account_code": "1001",
    "account_name": "Cash",
    "account_type": "Asset",
    "balance": 13000000,
    "total_debits": 15000000,
    "total_credits": 2000000,
    "as_of_date": "current",
    "balance_in_major_units": "130000.00"
  }
}
```

Note: Amounts in minor units (13000000 = ₹130,000.00)

---

## Journal Entries

### Create Journal Entry

Create a new journal entry (immutable once posted).

**Endpoint:** `POST /journal-entries`

Headers:
- `Idempotency-Key` (optional): Prevents duplicate entries on retry. If not provided, one will be auto-generated.

Request:
```json
{
  "date": "2025-01-15",
  "narration": "Office rent payment for January",
  "lines": [
    {
      "account_code": "5001",
      "debit": 2000000
    },
    {
      "account_code": "1001", 
      "credit": 2000000
    }
  ]
}
```

Parameters:
- `date` (string, required): Entry date in YYYY-MM-DD format (cannot be future)
- `narration` (string, required): Description of the transaction (max 1000 characters)
- `lines` (array, required): At least 2 journal lines
  - `account_code` (string, required): Must exist in accounts
  - `debit` (integer, optional): Debit amount in minor units
  - `credit` (integer, optional): Credit amount in minor units
- `reverses_entry_id` (integer, optional): ID of entry being reversed

Validation:
- Total debits must equal total credits
- Each line must have either debit OR credit (not both, not zero)
- All referenced accounts must exist
- Entry date cannot be in future

Example:
```bash
curl -X POST http://localhost:3000/api/journal-entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secure-api-key-123" \
  -d '{
    "date": "2025-01-15",
    "narration": "Office rent payment for January",
    "lines": [
      {
        "account_code": "5001",
        "debit": 2000000
      },
      {
        "account_code": "1001",
        "credit": 2000000
      }
    ]
  }'
```

Response (201):
```json
{
  "success": true,
  "message": "Journal entry created and posted successfully",
  "data": {
    "id": 1,
    "date": "2025-01-15",
    "narration": "Office rent payment for January",
    "posted_at": "2025-01-15T14:30:00.000Z",
    "reverses_entry_id": null,
    "lines": [
      {
        "account_code": "5001",
        "debit": 2000000,
        "credit": 0,
        "debit_major": "20000.00",
        "credit_major": "0.00"
      },
      {
        "account_code": "1001", 
        "debit": 0,
        "credit": 2000000,
        "debit_major": "0.00",
        "credit_major": "20000.00"
      }
    ]
  },
  "idempotent": false
}
```

Idempotent Response (200):
If the same `Idempotency-Key` is used again with identical request body:
```json
{
  "success": true,
  "message": "Journal entry already exists (idempotent)",
  "data": { /* same entry data */ },
  "idempotent": true
}
```

Error (400):
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Total debits (5000000) must equal total credits (3000000)"
}
```

### Get Journal Entry

Get journal entry with line items.

**Endpoint:** `GET /journal-entries/{id}`

Parameters:
- `id` (required): Journal entry ID

Example:
```bash
curl -H "x-api-key: my-secure-api-key-123" \
  http://localhost:3000/api/journal-entries/1
```

Response (200):
```json
{
  "success": true,
  "message": "Journal entry retrieved successfully",
  "data": {
    "id": 1,
    "date": "2025-01-15",
    "narration": "Office rent payment for January",
    "posted_at": "2025-01-15T14:30:00.000Z",
    "reverses_entry_id": null,
    "lines": [
      {
        "account_code": "5001",
        "account_name": "Rent Expense",
        "debit": 2000000,
        "credit": 0,
        "debit_major": "20000.00",
        "credit_major": "0.00"
      },
      {
        "account_code": "1001",
        "account_name": "Cash",
        "debit": 0,
        "credit": 2000000,
        "debit_major": "0.00", 
        "credit_major": "20000.00"
      }
    ]
  }
}
```

### List Journal Entries

Get paginated list of journal entries (newest first).

**Endpoint:** `GET /journal-entries`

Query Parameters:
- `limit` (optional): Number of entries to return (1-100, default: 50)
- `offset` (optional): Number of entries to skip (default: 0)

Examples:
```bash
# Get first 10 entries
curl -H "x-api-key: my-secure-api-key-123" \
  "http://localhost:3000/api/journal-entries?limit=10&offset=0"

# Get next 10 entries  
curl -H "x-api-key: my-secure-api-key-123" \
  "http://localhost:3000/api/journal-entries?limit=10&offset=10"
```

Response (200):
```json
{
  "success": true,
  "message": "Journal entries retrieved successfully",
  "data": {
    "entries": [
      {
        "id": 2,
        "date": "2025-01-16",
        "narration": "Sales receipt from customer ABC",
        "posted_at": "2025-01-16T09:15:00.000Z",
        "reverses_entry_id": null
      },
      {
        "id": 1,
        "date": "2025-01-15", 
        "narration": "Office rent payment for January",
        "posted_at": "2025-01-15T14:30:00.000Z",
        "reverses_entry_id": null
      }
    ],
    "count": 2,
    "pagination": {
      "limit": 50,
      "offset": 0,
      "has_more": false
    }
  }
}
```

---

## Common Error Responses

**401 Unauthorized:**
```json
{
  "error": "Invalid or missing API key"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Account not found",
  "error": "No account found with code: 9999"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Account code is required"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error while creating account",
  "error": "Database connection failed"
}
```

---

## Sample Workflow

Example setup:

### 1. Create Chart of Accounts
```bash
# Cash account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secure-api-key-123" \
  -d '{"code": "1001", "name": "Cash", "type": "Asset"}'

# Capital account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secure-api-key-123" \
  -d '{"code": "3001", "name": "Capital", "type": "Equity"}'

# Sales account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secure-api-key-123" \
  -d '{"code": "4001", "name": "Sales Revenue", "type": "Revenue"}'
```

### 2. Record Initial Investment
```bash
curl -X POST http://localhost:3000/api/journal-entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secure-api-key-123" \
  -d '{
    "date": "2025-01-01",
    "narration": "Initial capital investment",
    "lines": [
      {"account_code": "1001", "debit": 10000000},
      {"account_code": "3001", "credit": 10000000}
    ]
  }'
```

### 3. Record a Sale
```bash
curl -X POST http://localhost:3000/api/journal-entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secure-api-key-123" \
  -d '{
    "date": "2025-01-05",
    "narration": "Cash sale to customer",
    "lines": [
      {"account_code": "1001", "debit": 5000000},
      {"account_code": "4001", "credit": 5000000}
    ]
  }'
```

### 4. Check Cash Balance
```bash
curl -H "x-api-key: my-secure-api-key-123" \
  http://localhost:3000/api/accounts/1001/balance
```

Expected result: Cash balance should be ₹150,000.00 (15000000 minor units)

---

## Data Types and Formats

**Monetary Amounts:**
- All amounts are stored and transmitted as integers in minor currency units
- 1 Rupee = 100 Paise, so ₹1,000.00 = 100000 minor units
- Use the `*_major_units` fields for human-readable amounts

**Dates:**
- All dates use ISO format: YYYY-MM-DD
- Timestamps use ISO 8601 format: 2025-01-15T14:30:00.000Z

**Account Types:**
- `Asset`: Cash, Inventory, Equipment (debit normal balance)
- `Liability`: Accounts Payable, Loans (credit normal balance)  
- `Equity`: Capital, Retained Earnings (credit normal balance)
- `Revenue`: Sales, Service Income (credit normal balance)
- `Expense`: Rent, Salaries (debit normal balance)

**Balance Calculations:**
- Assets & Expenses: Positive when Debits > Credits
- Liabilities, Equity & Revenue: Positive when Credits > Debits