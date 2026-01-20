const db = require('../../database/db');

const { ExpenseSchema } = require('./expense.schema');

const ExpenseService = {

async create(data) {
    const validated = ExpenseSchema.parse(data);

    const user = await db('users').where({ id: validated.userId }).first();
    
    if (!user) {
      throw new Error(`USER_NOT_FOUND: No user found with ID ${validated.userId}`);
    }

    const currentSpend = await db('expenses')
      .where({ userId: validated.userId })
      .whereNot('status', 'Rejected')
      .sum('amount as total').first();

    const isOver = ((currentSpend.total || 0) + validated.amount) > (user.monthly_budget || 1000);

    const [id] = await db('expenses').insert({ 
      ...validated, 
      is_over_budget: isOver 
    });
    
    return { id, ...validated, isOverBudget: isOver };
  },

  async getAllReports() {
  return await db('expenses')
    .join('users', 'expenses.userId', '=', 'users.id')
    .select(
      'expenses.id',
      'expenses.amount',
      'expenses.category',
      'expenses.status',
      'users.name as staffName'
    )
    .orderBy('expenses.id', 'desc'); 
},

async updateStatus(expenseId, status) {
  const validStatuses = ['Pending', 'Approved', 'Rejected'];
  if (!validStatuses.includes(status)) {
    throw new Error('INVALID_STATUS');
  }

  const updated = await db('expenses')
    .where({ id: expenseId })
    .update({ status: status });

  if (!updated) throw new Error('EXPENSE_NOT_FOUND');
  return { id: expenseId, status };
},
  
async getAdminSummary() {
  return await db('expenses')
    .join('users', 'expenses.userId', '=', 'users.id')
    .select('users.name as staffName')
    .select(
  
      db.raw("SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END) as approvedTotal"),
      
      db.raw("SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as pendingTotal"),
      
      db.raw("SUM(CASE WHEN status = 'Rejected' THEN amount ELSE 0 END) as rejectedTotal"),
      
      db.raw("COUNT(expenses.id) as transactionCount")
    )
    .groupBy('users.id', 'users.name'); 
},

  async getCategoryBreakdown() {
    return await db('expenses')
      .select('category')
      .select(db.raw("SUM(amount) as total"))
      .where('status', 'Approved')
      .groupBy('category')
      .orderBy('total', 'desc');
  },

  async bulkApprove(ids, status) {
    return await db.transaction(async (trx) => {
      const updatedCount = await trx('expenses')
        .whereIn('id', ids)
        .update({ status: status });
        
      return { updatedCount, ids };
    });
  },
  
};



module.exports = ExpenseService;