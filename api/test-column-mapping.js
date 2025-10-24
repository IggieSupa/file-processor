// Test column name mapping
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const fetch = require("node-fetch");

const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MzgwNiwiZXhwIjoyMDcyNDU5ODA2fQ.jc4SR2v3HIBGUMHQDYE9BcAzbo8PGkUDWFmNr2eSN4s";

const supabase = createClient(supabaseUrl, supabaseKey);

const config = {
  api: {
    bodyParser: true,
  },
};

// Helper function to convert headers to snake_case (copied from main file)
function toSnakeCase(str) {
  return str
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

// Helper function to clean and validate data (copied from main file)
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

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Get a sample file and process it to see what columns we create
    const fileUrl =
      "https://tphpqptsskwnjtlsgrwj.supabase.co/storage/v1/object/public/outlet-imports/uploads/1761243273971-jv2kz.xlsx";

    // Download and process the file
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = jsonData[0];
    const sampleRow = jsonData[1]; // Get first data row

    // Show original headers
    const originalHeaders = headers;

    // Show converted headers
    const convertedHeaders = headers.map((h) => toSnakeCase(h));

    // Show cleaned data for first row
    const cleanedData = cleanData(sampleRow, headers);

    // Get actual database columns
    const { data: dbColumns, error: dbError } = await supabase
      .from("outlets")
      .select("*")
      .limit(1);

    const actualDbColumns =
      dbColumns && dbColumns[0] ? Object.keys(dbColumns[0]) : [];

    res.status(200).json({
      success: true,
      analysis: {
        originalHeaders: originalHeaders.slice(0, 10), // First 10 headers
        convertedHeaders: convertedHeaders.slice(0, 10), // First 10 converted
        sampleCleanedData: Object.keys(cleanedData).slice(0, 10), // First 10 keys
        actualDbColumns: actualDbColumns.slice(0, 10), // First 10 DB columns
        dbError: dbError?.message,
        columnMismatch: {
          missingInDb: convertedHeaders
            .filter((col) => !actualDbColumns.includes(col))
            .slice(0, 10),
          missingInData: actualDbColumns
            .filter((col) => !convertedHeaders.includes(col))
            .slice(0, 10),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Test failed",
      message: error.message,
      stack: error.stack,
    });
  }
}

module.exports = handler;
module.exports.config = config;
