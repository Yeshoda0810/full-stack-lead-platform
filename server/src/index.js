require('dotenv').config();
const { openDb, migrate } = require('./lib/db');
const { createApp } = require('./app');

const db = openDb();
migrate(db);

const app = createApp(db);
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Lead platform API listening on :${PORT}`);
});
