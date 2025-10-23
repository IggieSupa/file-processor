const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control'],
  credentials: false
}));

// Import and use the API handlers
const processFileHandler = require('./api/process-file.js');
const uploadChunkHandler = require('./api/upload-chunk.js');
const progressHandler = require('./api/progress.js');
const jobStatusHandler = require('./api/job-status.js');

// Mount the API routes
app.all('/api/process-file', processFileHandler);
app.all('/api/upload-chunk', uploadChunkHandler);
app.all('/api/progress', progressHandler);
app.all('/api/job-status', jobStatusHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'File processor API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📁 API endpoints:`);
  console.log(`   - POST /api/process-file`);
  console.log(`   - POST /api/upload-chunk`);
  console.log(`   - GET /api/progress`);
  console.log(`   - GET /api/job-status`);
  console.log(`   - GET /health`);
});
