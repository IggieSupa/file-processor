// Job status endpoint for checking job progress
export default async function handler(req, res) {
  // Add CORS headers - must be set before any response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobId } = req.query;

  if (!jobId) {
    return res.status(400).json({ error: "Job ID is required" });
  }

  // Check if job exists
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: "Job not found",
      jobId,
    });
  }

  // Return job status
  res.status(200).json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      totalBatches: job.totalBatches,
      currentBatch: job.currentBatch,
      totalRows: job.totalRows,
      rowsProcessed: job.rowsProcessed,
      startTime: job.startTime,
      endTime: job.endTime,
      results: job.results,
    },
  });
}

// Import jobs from the main file (in production, use shared storage)
const jobs = global.jobs || new Map();
global.jobs = jobs;
