// Server-Sent Events endpoint for real-time progress updates
export default async function handler(req, res) {
  // CORS headers - MUST be set first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
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

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Send initial connection message
  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      message: "Connected to progress stream",
    })}\n\n`
  );

  // Function to send progress update
  const sendProgress = (job) => {
    res.write(
      `data: ${JSON.stringify({
        type: "progress",
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        totalBatches: job.totalBatches,
        currentBatch: job.currentBatch,
        totalRows: job.totalRows,
        rowsProcessed: job.rowsProcessed,
        startTime: job.startTime,
        endTime: job.endTime,
      })}\n\n`
    );
  };

  // Check if job exists
  const job = jobs.get(jobId);
  if (!job) {
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Job not found",
      })}\n\n`
    );
    res.end();
    return;
  }

  // Send current job status
  sendProgress(job);

  // If job is already completed or failed, send final status and close
  if (job.status === "completed" || job.status === "error") {
    res.write(
      `data: ${JSON.stringify({
        type: "final",
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        results: job.results,
        startTime: job.startTime,
        endTime: job.endTime,
      })}\n\n`
    );
    res.end();
    return;
  }

  // Set up interval to check for updates
  const interval = setInterval(() => {
    const currentJob = jobs.get(jobId);

    if (!currentJob) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: "Job not found",
        })}\n\n`
      );
      clearInterval(interval);
      res.end();
      return;
    }

    // Send progress update
    sendProgress(currentJob);

    // If job is completed or failed, send final status and close
    if (currentJob.status === "completed" || currentJob.status === "error") {
      res.write(
        `data: ${JSON.stringify({
          type: "final",
          jobId: currentJob.id,
          status: currentJob.status,
          progress: currentJob.progress,
          message: currentJob.message,
          results: currentJob.results,
          startTime: currentJob.startTime,
          endTime: currentJob.endTime,
        })}\n\n`
      );
      clearInterval(interval);
      res.end();
    }
  }, 1000); // Check every second

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(interval);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
  }, 30000); // Send ping every 30 seconds

  req.on("close", () => {
    clearInterval(keepAlive);
  });
}

// Import jobs from the main file (in production, use shared storage)
const jobs = global.jobs || new Map();
global.jobs = jobs;
