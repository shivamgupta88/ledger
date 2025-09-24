const db = require('./config/database'); // apna db.js import karo

(async () => {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('Current Time:', result.rows[0].now);
    process.exit(0); // exit after check
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
})();
