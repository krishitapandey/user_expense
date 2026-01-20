require('dotenv').config(); 
const express = require('express');
const { z } = require('zod');
const UserService = require('./modules/users/user.service');
const ExpenseService = require('./modules/expenses/expense.service');
const { authenticate, authorize } = require('./middleware/auth');
const port = process.env.PORT || 3000;

const app = express();

app.use(express.json()); 

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ status: "error", message: "Invalid JSON format." });
  }
  next();
});

app.post('/api/auth/register', async (req, res) => {

  try {

    const user = await UserService.register(req.body);
    res.status(201).json(user);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ errors: e.issues });
    if (e.message === 'USER_EXISTS') return res.status(409).json({ error: "Email already taken" });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await UserService.login(email, password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: "Invalid email or password" });
  }
});

app.post('/api/expenses', authenticate, async (req, res) => {
  try {
    const expense = await ExpenseService.create({ ...req.body, userId: req.user.id });
    res.status(201).json(expense);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/admin/expenses/:id/status', authenticate, authorize(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 
    
    const result = await ExpenseService.updateStatus(id, status);
    res.json({ message: `Expense ${id} has been ${status.toLowerCase()}`, data: result });
  } catch (e) {
    if (e.message === 'INVALID_STATUS') return res.status(400).json({ error: "Invalid status. Use Pending, Approved, or Rejected." });
    if (e.message === 'EXPENSE_NOT_FOUND') return res.status(404).json({ error: "Expense record not found." });
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/admin/reports', authenticate, authorize(['Admin']), async (req, res) => {
  try {
    const summary = await ExpenseService.getAdminSummary();
    const rawList = await ExpenseService.getAllReports();
    
    const totalCompanySpend = summary.reduce((acc, curr) => acc + Number(curr.approvedTotal), 0);
    const totalCompanySavings = summary.reduce((acc, curr) => acc + Number(curr.rejectedTotal), 0);
    
    res.json({
      title: "Executive Expense Overview",
      metrics: {
        totalSpent: totalCompanySpend,
        totalSaved: totalCompanySavings,
        pendingReview: summary.reduce((acc, curr) => acc + Number(curr.pendingTotal), 0)
      },
      summary: summary,
      all_transactions: rawList
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/analytics/categories', authenticate, authorize(['Admin']), async (req, res) => {
  try {
    const data = await ExpenseService.getCategoryBreakdown();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.post('/api/admin/expenses/bulk-update', authenticate, authorize(['Admin']), async (req, res) => {
  try {
    const { ids, status } = req.body; 
    if (!Array.isArray(ids)) return res.status(400).json({ error: "IDs must be an array" });
    
    const result = await ExpenseService.bulkApprove(ids, status);
    res.json({ message: "Bulk update successful", ...result });
  } catch (e) {
    res.status(500).json({ error: "Transaction failed. No changes were made." });
  }
});


app.use((err, req, res, next) => {
  console.error(err.stack); 


  if (err.name === 'ZodError') {
    return res.status(400).json({ status: 'error', type: 'Validation', issues: err.errors });
  }


  if (err.message === 'INVALID_CREDENTIALS') {
    return res.status(401).json({ status: 'error', message: 'Wrong email or password' });
  }


  res.status(500).json({ 
    status: 'error', 
    message: 'Something went wrong on our end.' 
  });
});

app.listen(port, () => console.log(`System ready on port ${port}`));