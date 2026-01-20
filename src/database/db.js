const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: "./data.sqlite" },
  useNullAsDefault: true
});

async function initDB() {

if (!await knex.schema.hasTable('users')) {
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('name');
    table.string('email').unique();
    table.string('password');
    table.string('role').defaultTo('Staff');
    table.float('monthly_budget').defaultTo(1000.0); 
  });
}

if (!await knex.schema.hasTable('expenses')) {
  await knex.schema.createTable('expenses', (table) => {
    table.increments('id');
    table.string('userId').references('users.id');
    table.float('amount');
    table.string('category');
    table.string('status').defaultTo('Pending');
    table.boolean('is_over_budget').defaultTo(false); 
  });
}
}

initDB();
module.exports = knex;

