const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Backend could not connect to a database:', error.message);
    process.exit(1);
  });
