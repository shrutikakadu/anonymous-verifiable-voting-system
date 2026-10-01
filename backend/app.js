const express = require('express');
const authRoutes = require('./routes/authRoutes');
const voterRoutes = require('./routes/voterRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const voteRoutes = require('./routes/voteRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'anonymous-voting-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/voter', voterRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

module.exports = app;
