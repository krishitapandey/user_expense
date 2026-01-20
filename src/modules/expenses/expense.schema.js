
const { z } = require('zod');
    
const ExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(3),
  userId: z.string()
});

module.exports = { ExpenseSchema };