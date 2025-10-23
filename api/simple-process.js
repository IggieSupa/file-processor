// Simple test API to verify deployment
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const fetch = require("node-fetch");

// Supabase configuration
const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODM4MDYsImV4cCI6MjA3MjQ1OTgwNn0.Za_gtehw-0gNdvzHWshXKXiS7AkDON6kSOKCDpsReJg";
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Access-Control-Allow-Credentials", "false");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type");
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

  try {
    const body = JSON.parse(req.body);
    const { fileUrl, fileName, fileType } = body;

    if (!fileUrl) {
      return res.status(400).json({ error: "fileUrl is required" });
    }

    console.log("Processing file from URL:", fileUrl);
    
    // Process the file
    const { headers, rows } = await processXLSXFromUrl(fileUrl);
    
    console.log(`File processed: ${rows.length} rows, ${headers.length} columns`);

    // Insert first 10 rows as test
    const testRows = rows.slice(0, 10).map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header.toLowerCase().replace(/\s+/g, '_')] = row[i];
      });
      return obj;
    });

    const { data, error } = await supabase
      .from("outlets")
      .insert(testRows);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "File processed successfully",
      summary: {
        totalRows: rows.length,
        processedRows: testRows.length,
        headers: headers.length
      }
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
}

module.exports = handler;
