const Joi = require('joi');

const createAccountSchema = Joi.object({
  code: Joi.string().min(1).max(20).required(),
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('Asset', 'Liability', 'Equity', 'Revenue', 'Expense').required()
});

const journalLineSchema = Joi.object({
  account_code: Joi.string().min(1).max(20).required(),
  debit: Joi.number().integer().min(0).optional(),
  credit: Joi.number().integer().min(0).optional()
}).custom((value, helpers) => {
  const { debit = 0, credit = 0 } = value;
  if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
    return helpers.error('custom.xor');
  }
  return value;
}).message({
  'custom.xor': 'Must have either debit or credit, not both'
});

const createJournalEntrySchema = Joi.object({
  date: Joi.date().max('now').required(),
  narration: Joi.string().min(1).max(1000).required(),
  lines: Joi.array().items(journalLineSchema).min(2).required(),
  reverses_entry_id: Joi.number().integer().positive().optional()
});

const validateAccount = (data) => {
  const { error, value } = createAccountSchema.validate(data);
  
  if (error) {
    return { isValid: false, error: error.details[0].message };
  }
  return { isValid: true, value };
};

const validateJournalEntry = (data) => {
  const { error, value } = createJournalEntrySchema.validate(data);

  if (error) {
    return { isValid: false, error: error.details[0].message };
  }

  const totalDebits = value.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = value.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  if (totalDebits !== totalCredits) {
    return {
      isValid: false,
      error: `Total debits (${totalDebits}) must equal total credits (${totalCredits})`
    };
  }

  if (totalDebits === 0 || totalCredits === 0) {
    return {
      isValid: false,
      error: 'Entry must have non-zero amounts'
    };
  }

  return { isValid: true, value };
};

module.exports = {
  validateAccount,
  validateJournalEntry,
  createAccountSchema,
  createJournalEntrySchema
};