// File Processor API - Supabase Storage Only (No formidable) - V2
// This API only processes files from Supabase Storage URLs
// No direct file uploads supported - use Supabase Storage first
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const csv = require("csv-parser");
const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");

// Supabase configuration
const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MzgwNiwiZXhwIjoyMDcyNDU5ODA2fQ.jc4SR2v3HIBGUMHQDYE9BcAzbo8PGkUDWFmNr2eSN4s";

const supabase = createClient(supabaseUrl, supabaseKey);

// Job tracking removed - not needed for serverless environment

// Configure API route for Vercel
const config = {
  api: {
    bodyParser: true,
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

// Mapping from Excel headers to database column names
const headerMapping = {
  // Exact mappings from the actual Excel file
  "STP": "stp",
  "Sales Region": "sales_region",
  "Sales District Code": "sales_district_code",
  "Sales District": "sales_district",
  "Plant Code": "plant_code",
  "Plant": "plant",
  "Sales Area Code": "sales_area_code",
  "Sales Area": "sales_area",
  "Sales team Code": "sales_team_code",
  "Sales Team": "sales_team",
  "Sales Sector Code": "sales_sector_code",
  "Sales Sector": "sales_sector",
  "Sales Contact Name": "sales_contact_name",
  "Sales Contact Surnam": "sales_contact_surnam",
  "Sales Contact Teleph": "sales_contact_teleph",
  "Sold-to party": "sold_to_party",
  "Outlet Name": "outlet_name",
  "Street Name": "street_name",
  "BAS:  Street 4": "bas_street_4",
  "BAS: Street 5": "bas_street_5",
  "Latitude": "latitude",
  "Longitude": "longitude",
  "Postal Code": "postal_code",
  "Geographical Location": "geographical_location",
  "Licence Type": "licence_type",
  "License number": "license_number",
  "Created on": "created_on",
  "Account group Code": "account_group_code",
  "Account Group": "account_group",
  "Segment": "segment",
  "Sub Segment": "sub_segment",
  "Beer Category/Strategy": "beer_category_strategy",
  "Local Channel": "local_channel",
  "Call Frequency": "call_frequency",
  "National Group Code": "national_group_code",
  "National Group": "national_group",
  "Regional Group": "regional_group",
  "Regional Group Code": "regional_group_code",
  "Dead & Dying Indicator": "dead_dying_indicator",
  "TSP Call Frequency                               (# Calls per 4 Week Cycle)": "tsp_call_frequency",
  "TSP Call Duration (Minutes per Call)": "tsp_call_duration",
  "TSP Rep Type": "tsp_rep_type",
  "HE Outlet": "he_outlet",
  "Delivery Code": "delivery_code",
  "Merhandising Call": "merchandising_call",
  "BEES Registered": "bees_registered",
  "BEES Registration Date": "bees_registration_date",
  "Licence Expiry Date.": "licence_expiry_date_1",
  "Payer #": "payer_number",
  "Payment Terms": "payment_terms",
  "Payment Method": "payment_method",
  "License Expiry Date": "license_expiry_date_2",
  "Delivery Long": "delivery_long",
  "Delivery Lat": "delivery_lat",
  "Ind: Delivery on Mon": "ind_delivery_on_mon",
  "Ind: Delivery on Tue": "ind_delivery_on_tue",
  "Ind: Delivery on Wed": "ind_delivery_on_wed",
  "Ind: Delivery on Thu": "ind_delivery_on_thu",
  "Ind: Delivery on Fri": "ind_delivery_on_fri",
  "Ind: Delivery on Sat": "ind_delivery_on_sat",
  "Ind: Delivery on Sun": "ind_delivery_on_sun",
  "Draught Outlet": "draught_outlet",
  "Fridge Outlet": "fridge_outlet"
};

// Function to map Excel header to database column name
function mapHeaderToColumn(header) {
  // First try exact match
  if (headerMapping[header]) {
    return headerMapping[header];
  }
  
  // Try case-insensitive match
  const lowerHeader = header.toLowerCase().trim();
  for (const [excelHeader, dbColumn] of Object.entries(headerMapping)) {
    if (excelHeader.toLowerCase().trim() === lowerHeader) {
      return dbColumn;
    }
  }
  
  // If no match found, convert to snake_case and return
  return toSnakeCase(header);
}

// Helper function to clean and validate data
function cleanData(row, headers) {
  const cleanedRow = {};

  headers.forEach((header, index) => {
    const key = mapHeaderToColumn(header);
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
    // Extract file path from URL
    const urlParts = fileUrl.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid Supabase Storage URL format');
    }
    
    const filePath = urlParts[1];
    const pathParts = filePath.split('/');
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');
    
    // Download file using Supabase client
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName);
    
    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
    
    const arrayBuffer = await data.arrayBuffer();
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
    // Extract file path from URL
    const urlParts = fileUrl.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid Supabase Storage URL format');
    }
    
    const filePath = urlParts[1];
    const pathParts = filePath.split('/');
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');
    
    // Download file using Supabase client
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName);
    
    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
    
    const text = await data.text();
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

// Function to create JSON batches
async function createJSONBatches(rows, headers, batchSize = 1000) {
  const batches = [];
  const totalBatches = Math.ceil(rows.length / batchSize);

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
  }

  return batches;
}

// Function to seed data to Supabase
async function seedToSupabase(batches) {
  const results = [];
  const totalBatches = batches.length;

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
    } catch (error) {
      results.push({
        batchNumber: batch.batchNumber,
        status: "error",
        rowsInserted: 0,
        message: `Error inserting batch: ${error.message}`,
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
  fileUrl,
  fileName,
  fileType
) {
  try {
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
      });
    }

    console.log(
      `Processing ${rows.length} rows with ${headers.length} columns`
    );

    // Create JSON batches
    const batches = await createJSONBatches(rows, headers);
    console.log(`Created ${batches.length} JSON batches`);

    // Seed data to Supabase
    const seedResults = await seedToSupabase(batches);

    // Calculate final results
    const successCount = seedResults.filter(
      (r) => r.status === "success"
    ).length;
    const errorCount = seedResults.filter((r) => r.status === "error").length;
    const totalRowsProcessed = seedResults.reduce(
      (sum, r) => sum + r.rowsInserted,
      0
    );

    res.status(200).json({
      success: true,
      message: "File processed successfully from Supabase Storage",
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
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

// Main API handler - SUPPORT BOTH DIRECT UPLOAD AND SUPABASE STORAGE
async function handler(req, res) {
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

  try {

    // Only handle Supabase Storage URL requests
    if (!req.headers["content-type"]?.includes("application/json")) {
      return res.status(400).json({
        error: "This API only accepts Supabase Storage URLs. Please send JSON with fileUrl, fileName, and fileType.",
      });
    }

    const body = req.body;
    const { fileUrl, fileName, fileType } = body;

    if (!fileUrl) {
      return res.status(400).json({
        error: "fileUrl is required. Please provide a Supabase Storage URL.",
      });
    }

    // Handle Supabase Storage URL
    await handleSupabaseStorageUpload(
      req,
      res,
      fileUrl,
      fileName,
      fileType
    );
  } catch (error) {
    console.error("Error processing file:", error);

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

module.exports = handler;
module.exports.config = config;
