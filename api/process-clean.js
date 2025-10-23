// Clean file processor API - No formidable dependency
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const fetch = require("node-fetch");

// Supabase configuration
const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODM4MDYsImV4cCI6MjA3MjQ1OTgwNn0.Za_gtehw-0gNdvzHWshXKXiS7AkDON6kSOKCDpsReJg";
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory job tracking
const jobs = global.jobs || new Map();
global.jobs = jobs;

// CORS headers
function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Access-Control-Allow-Credentials", "false");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type");
}

// Convert headers to snake_case
function toSnakeCase(str) {
  return str
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

// Clean and validate data
function cleanData(row, headers) {
  const cleanedRow = {};
  headers.forEach((header, index) => {
    const key = toSnakeCase(header);
    let value = row[index] || row[header] || null;

    if (typeof value === "string") {
      value = value.trim();
      if (value === "" || value === "null" || value === "undefined") {
        value = null;
      }
    }

    // Convert specific fields to appropriate types
    if (key === "latitude" || key === "longitude" || key === "delivery_long" || key === "delivery_lat") {
      value = value ? parseFloat(value) : null;
    }

    if (key === "call_frequency" || key === "tsp_call_frequency" || key === "tsp_call_duration") {
      value = value ? parseInt(value) : null;
    }

    if (key.includes("ind_delivery") || key === "dead_dying_indicator" || key === "he_outlet" || 
        key === "merchandising_call" || key === "bees_registered" || key === "draught_outlet" || 
        key === "fridge_outlet") {
      if (typeof value === "string") {
        value = value.toLowerCase() === "true" || value.toLowerCase() === "yes" || value === "1";
      }
    }

    if (key.includes("date") || key === "created_on") {
      if (value) {
        const date = new Date(value);
        value = isNaN(date.getTime()) ? null : date.toISOString();
      }
    }

    cleanedRow[key] = value;
  });
  return cleanedRow;
}

// Process XLSX from URL
async function processXLSXFromUrl(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length === 0) {
    throw new Error("No data found in the file");
  }
  
  const headers = jsonData[0];
  const rows = jsonData.slice(1);
  return { headers, rows };
}

// Process CSV from URL
async function processCSVFromUrl(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const text = await response.text();
  const lines = text.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));
  return { headers, rows };
}

// Create batches and insert to Supabase
async function processAndInsert(rows, headers, jobId) {
  const batchSize = 1000;
  const totalBatches = Math.ceil(rows.length / batchSize);
  let totalInserted = 0;
  let successfulBatches = 0;
  let failedBatches = 0;

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, rows.length);
    const batchRows = rows.slice(start, end);
    
    const processedRows = batchRows.map((row) => cleanData(row, headers));
    
    try {
      const { data, error } = await supabase
        .from("outlets")
        .insert(processedRows);

      if (error) {
        throw error;
      }

      totalInserted += processedRows.length;
      successfulBatches++;
      
      // Update progress
      const progress = Math.round(((i + 1) / totalBatches) * 100);
      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: "processing",
        progress,
        message: `Processed batch ${i + 1}/${totalBatches}`,
        currentBatch: i + 1,
        totalBatches
      });

    } catch (error) {
      failedBatches++;
      console.error(`Error in batch ${i + 1}:`, error.message);
    }
  }

  return {
    totalInserted,
    successfulBatches,
    failedBatches,
    totalBatches
  };
}

// Main handler
async function handler(req, res) {
  setCORSHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Initialize job
    jobs.set(jobId, {
      id: jobId,
      status: "starting",
      progress: 0,
      message: "Starting file processing...",
      startTime: new Date().toISOString()
    });

    const body = JSON.parse(req.body);
    const { fileUrl, fileName, fileType } = body;

    if (!fileUrl) {
      return res.status(400).json({ error: "fileUrl is required" });
    }

    // Update job status
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "downloading",
      progress: 5,
      message: "Downloading file from Supabase Storage..."
    });

    // Process file based on type
    let headers, rows;
    const fileExtension = fileType || fileName?.split(".").pop()?.toLowerCase();

    if (fileExtension === "xlsx") {
      ({ headers, rows } = await processXLSXFromUrl(fileUrl));
    } else if (fileExtension === "csv") {
      ({ headers, rows } = await processCSVFromUrl(fileUrl));
    } else {
      return res.status(400).json({
        error: "Invalid file type. Please upload XLSX or CSV files only."
      });
    }

    // Update job status
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "processing",
      progress: 10,
      message: `File parsed: ${rows.length} rows, ${headers.length} columns`,
      totalRows: rows.length
    });

    // Process and insert data
    const results = await processAndInsert(rows, headers, jobId);

    // Mark job as completed
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "completed",
      progress: 100,
      message: "Processing completed successfully",
      endTime: new Date().toISOString(),
      results
    });

    res.status(200).json({
      success: true,
      message: "File processed successfully",
      jobId,
      summary: {
        totalRows: rows.length,
        totalInserted: results.totalInserted,
        successfulBatches: results.successfulBatches,
        failedBatches: results.failedBatches,
        totalBatches: results.totalBatches
      }
    });

  } catch (error) {
    console.error("Error processing file:", error);
    
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "error",
      progress: 0,
      message: error.message,
      endTime: new Date().toISOString()
    });

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      jobId
    });
  }
}

module.exports = handler;
