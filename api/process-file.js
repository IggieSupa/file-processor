import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import csv from "csv-parser";
import fs from "fs-extra";
import path from "path";
import fetch from "node-fetch";

// Use require for formidable as it doesn't support ES modules properly - Fixed
const formidable = require("formidable").default;

// Supabase configuration
const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODM4MDYsImV4cCI6MjA3MjQ1OTgwNn0.Za_gtehw-0gNdvzHWshXKXiS7AkDON6kSOKCDpsReJg";

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory job tracking (in production, use Redis or database)
const jobs = global.jobs || new Map();
global.jobs = jobs;

// Configure API route for Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to convert headers to snake_case
function toSnakeCase(str) {
  return str
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

// Helper function to clean and validate data
function cleanData(row, headers) {
  const cleanedRow = {};

  headers.forEach((header, index) => {
    const key = toSnakeCase(header);
    let value = row[index] || row[header] || null;

    // Clean up the value
    if (typeof value === "string") {
      value = value.trim();
      if (value === "" || value === "null" || value === "undefined") {
        value = null;
      }
    }

    // Convert specific fields to appropriate types
    if (
      key === "latitude" ||
      key === "longitude" ||
      key === "delivery_long" ||
      key === "delivery_lat"
    ) {
      value = value ? parseFloat(value) : null;
    }

    if (
      key === "call_frequency" ||
      key === "tsp_call_frequency" ||
      key === "tsp_call_duration"
    ) {
      value = value ? parseInt(value) : null;
    }

    if (
      key.includes("ind_delivery") ||
      key === "dead_dying_indicator" ||
      key === "he_outlet" ||
      key === "merchandising_call" ||
      key === "bees_registered" ||
      key === "draught_outlet" ||
      key === "fridge_outlet"
    ) {
      if (typeof value === "string") {
        value =
          value.toLowerCase() === "true" ||
          value.toLowerCase() === "yes" ||
          value === "1";
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

// Function to process XLSX file
async function processXLSX(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      throw new Error("No data found in the file");
    }

    const headers = jsonData[0];
    const rows = jsonData.slice(1);

    return { headers, rows };
  } catch (error) {
    throw new Error(`Error processing XLSX file: ${error.message}`);
  }
}

// Function to process CSV file
async function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const headers = [];
    let isFirstRow = true;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        if (isFirstRow) {
          headers.push(...Object.keys(data));
          isFirstRow = false;
        }
        results.push(Object.values(data));
      })
      .on("end", () => {
        resolve({ headers, rows: results });
      })
      .on("error", (error) => {
        reject(new Error(`Error processing CSV file: ${error.message}`));
      });
  });
}

// Function to process XLSX file from URL
async function processXLSXFromUrl(fileUrl) {
  try {
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
  } catch (error) {
    throw new Error(`Error processing XLSX file: ${error.message}`);
  }
}

// Function to process CSV file from URL
async function processCSVFromUrl(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const text = await response.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines
      .slice(1)
      .map((line) => line.split(",").map((cell) => cell.trim()));

    return { headers, rows };
  } catch (error) {
    throw new Error(`Error processing CSV file: ${error.message}`);
  }
}

// Function to create JSON batches with progress tracking
async function createJSONBatches(rows, headers, jobId, batchSize = 1000) {
  const batches = [];
  const totalBatches = Math.ceil(rows.length / batchSize);

  // Update job progress
  jobs.set(jobId, {
    ...jobs.get(jobId),
    status: "processing",
    totalBatches,
    currentBatch: 0,
    progress: 0,
  });

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, rows.length);
    const batchRows = rows.slice(start, end);

    const processedRows = batchRows.map((row) => cleanData(row, headers));

    const batchData = {
      batch_number: i + 1,
      total_batches: totalBatches,
      rows_in_batch: processedRows.length,
      created_at: new Date().toISOString(),
      data: processedRows,
    };

    const fileName = `outlets_batch_${i + 1}_of_${totalBatches}.json`;
    const filePath = path.join("/tmp", fileName);

    await fs.writeJson(filePath, batchData, { spaces: 2 });

    batches.push({
      fileName,
      filePath,
      batchNumber: i + 1,
      rowCount: processedRows.length,
    });

    // Update progress
    const progress = Math.round(((i + 1) / totalBatches) * 50); // 50% for processing
    jobs.set(jobId, {
      ...jobs.get(jobId),
      currentBatch: i + 1,
      progress,
      message: `Processed batch ${i + 1}/${totalBatches}`,
    });
  }

  return batches;
}

// Function to seed data to Supabase with progress tracking
async function seedToSupabase(batches, jobId) {
  const results = [];
  const totalBatches = batches.length;

  // Update job status to seeding
  jobs.set(jobId, {
    ...jobs.get(jobId),
    status: "seeding",
    message: "Starting to seed data to Supabase...",
  });

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const batchData = await fs.readJson(batch.filePath);

      // Insert data into Supabase
      const { data, error } = await supabase
        .from("outlets")
        .insert(batchData.data);

      if (error) {
        throw error;
      }

      results.push({
        batchNumber: batch.batchNumber,
        status: "success",
        rowsInserted: batch.rowCount,
        message: `Successfully inserted ${batch.rowCount} rows`,
      });

      // Update progress (50% + 50% for seeding)
      const progress = 50 + Math.round(((i + 1) / totalBatches) * 50);
      jobs.set(jobId, {
        ...jobs.get(jobId),
        currentBatch: i + 1,
        progress,
        message: `Seeded batch ${i + 1}/${totalBatches} to Supabase`,
      });
    } catch (error) {
      results.push({
        batchNumber: batch.batchNumber,
        status: "error",
        rowsInserted: 0,
        message: `Error inserting batch: ${error.message}`,
      });

      // Update progress even on error
      const progress = 50 + Math.round(((i + 1) / totalBatches) * 50);
      jobs.set(jobId, {
        ...jobs.get(jobId),
        currentBatch: i + 1,
        progress,
        message: `Error in batch ${i + 1}/${totalBatches}`,
      });
    }
  }

  return results;
}

// CORS middleware function
function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, OPTIONS, PUT, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Access-Control-Allow-Credentials", "false");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Type"
  );
}

// Function to handle Supabase Storage URL uploads - Updated
async function handleSupabaseStorageUpload(
  req,
  res,
  jobId,
  fileUrl,
  fileName,
  fileType
) {
  try {
    // Update job status
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "downloading",
      progress: 5,
      message: "Downloading file from Supabase Storage...",
    });

    // Process the file based on type
    let headers, rows;
    const fileExtension = fileType || fileName?.split(".").pop()?.toLowerCase();

    if (fileExtension === "xlsx") {
      ({ headers, rows } = await processXLSXFromUrl(fileUrl));
    } else if (fileExtension === "csv") {
      ({ headers, rows } = await processCSVFromUrl(fileUrl));
    } else {
      return res.status(400).json({
        error: "Invalid file type. Please upload XLSX or CSV files only.",
        jobId,
      });
    }

    // Update job with file info
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "processing",
      progress: 10,
      message: `File parsed: ${rows.length} rows, ${headers.length} columns`,
      totalRows: rows.length,
    });

    console.log(
      `Processing ${rows.length} rows with ${headers.length} columns`
    );

    // Create JSON batches
    const batches = await createJSONBatches(rows, headers, jobId);
    console.log(`Created ${batches.length} JSON batches`);

    // Seed data to Supabase
    const seedResults = await seedToSupabase(batches, jobId);

    // Calculate final results
    const successCount = seedResults.filter(
      (r) => r.status === "success"
    ).length;
    const errorCount = seedResults.filter((r) => r.status === "error").length;
    const totalRowsProcessed = seedResults.reduce(
      (sum, r) => sum + r.rowsInserted,
      0
    );

    // Mark job as completed
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "completed",
      progress: 100,
      message: "Processing completed successfully",
      endTime: new Date().toISOString(),
      results: {
        totalRows: rows.length,
        totalBatches: batches.length,
        successfulBatches: successCount,
        failedBatches: errorCount,
        totalRowsInserted: totalRowsProcessed,
      },
    });

    res.status(200).json({
      success: true,
      message: "File processed successfully from Supabase Storage",
      jobId,
      summary: {
        totalRows: rows.length,
        totalBatches: batches.length,
        successfulBatches: successCount,
        failedBatches: errorCount,
        totalRowsInserted: totalRowsProcessed,
      },
      batchResults: seedResults,
    });
  } catch (error) {
    console.error("Error processing Supabase Storage file:", error);
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "error",
      progress: 0,
      message: error.message,
      endTime: new Date().toISOString(),
    });
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      jobId,
    });
  }
}

// Main API handler - SUPPORT BOTH DIRECT UPLOAD AND SUPABASE STORAGE
export default async function handler(req, res) {
  // Set CORS headers first
  setCORSHeaders(res);

  // Handle preflight OPTIONS request
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
      status: "uploading",
      progress: 0,
      message: "Processing file upload...",
      totalBatches: 0,
      currentBatch: 0,
      totalRows: 0,
      rowsProcessed: 0,
      startTime: new Date().toISOString(),
    });

    // Check if this is a Supabase Storage URL request
    if (req.headers["content-type"]?.includes("application/json")) {
      const body = JSON.parse(req.body);
      const { fileUrl, fileName, fileType } = body;

      if (fileUrl) {
        // Handle Supabase Storage URL
        await handleSupabaseStorageUpload(
          req,
          res,
          jobId,
          fileUrl,
          fileName,
          fileType
        );
        return; // Ensure we don't continue to formidable
      }
    }

    // Handle direct file upload (original method)
    const form = formidable({
      maxFileSize: 4 * 1024 * 1024, // 4MB limit - Vercel's actual limit
      uploadDir: "/tmp",
      keepExtensions: true,
      maxFields: 1000,
      maxFieldsSize: 1 * 1024 * 1024, // 1MB for fields
    });

    const [fields, files] = await form.parse(req);

    if (!files.file || !files.file[0]) {
      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: "error",
        message: "No file uploaded",
      });
      return res.status(400).json({ error: "No file uploaded", jobId });
    }

    const file = files.file[0];
    const filePath = file.filepath;
    const originalName = file.originalFilename;
    const fileExtension = path.extname(originalName).toLowerCase();

    // Validate file type
    if (![".xlsx", ".csv"].includes(fileExtension)) {
      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: "error",
        message: "Invalid file type",
      });
      return res.status(400).json({
        error: "Invalid file type. Please upload XLSX or CSV files only.",
        jobId,
      });
    }

    // Update job status
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "parsing",
      progress: 5,
      message: "Parsing file...",
    });

    // Process the file based on type
    let headers, rows;

    if (fileExtension === ".xlsx") {
      ({ headers, rows } = await processXLSX(filePath));
    } else if (fileExtension === ".csv") {
      ({ headers, rows } = await processCSV(filePath));
    }

    // Update job with file info
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "processing",
      progress: 10,
      message: `File parsed: ${rows.length} rows, ${headers.length} columns`,
      totalRows: rows.length,
    });

    console.log(
      `Processing ${rows.length} rows with ${headers.length} columns`
    );

    // Create JSON batches
    const batches = await createJSONBatches(rows, headers, jobId);
    console.log(`Created ${batches.length} JSON batches`);

    // Seed data to Supabase
    const seedResults = await seedToSupabase(batches, jobId);

    // Clean up temporary files
    await fs.remove(filePath);
    for (const batch of batches) {
      await fs.remove(batch.filePath);
    }

    // Calculate final results
    const successCount = seedResults.filter(
      (r) => r.status === "success"
    ).length;
    const errorCount = seedResults.filter((r) => r.status === "error").length;
    const totalRowsProcessed = seedResults.reduce(
      (sum, r) => sum + r.rowsInserted,
      0
    );

    // Mark job as completed
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "completed",
      progress: 100,
      message: "Processing completed successfully",
      endTime: new Date().toISOString(),
      results: {
        totalRows: rows.length,
        totalBatches: batches.length,
        successfulBatches: successCount,
        failedBatches: errorCount,
        totalRowsInserted: totalRowsProcessed,
      },
    });

    res.status(200).json({
      success: true,
      message: "File processed successfully",
      jobId,
      summary: {
        totalRows: rows.length,
        totalBatches: batches.length,
        successfulBatches: successCount,
        failedBatches: errorCount,
        totalRowsInserted: totalRowsProcessed,
      },
      batchResults: seedResults,
    });
  } catch (error) {
    console.error("Error processing file:", error);

    // Mark job as failed
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "error",
      progress: 0,
      message: error.message,
      endTime: new Date().toISOString(),
    });

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      jobId,
    });
  }
}
