// Job status endpoint for checking job progress
export default async function handler(req, res) {
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
