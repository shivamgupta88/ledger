const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  host: process.env.DB_HOST ,
  port: process.env.DB_PORT || 23649,
  database: process.env.DB_NAME ,
  ssl: {
    rejectUnauthorized: false,
    ca: process.env.DB_CA_CERT, // .env se load karna better hai
  },
});

// check connection once at startup
pool.connect()
  .then(client => {
    return client
      .query('SELECT NOW()')
      .then(res => {
        console.log('✅ DB connected at:', res.rows[0].now);
        client.release();
      })
      .catch(err => {
        client.release();
        console.error('❌ DB test query failed:', err.stack);
      });
  })
  .catch(err => console.error('❌ DB connection error:', err.stack));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
