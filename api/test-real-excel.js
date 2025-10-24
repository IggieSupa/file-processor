// Test real Excel file with Supabase client
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");

const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MzgwNiwiZXhwIjoyMDcyNDU5ODA2fQ.jc4SR2v3HIBGUMHQDYE9BcAzbo8PGkUDWFmNr2eSN4s";

const supabase = createClient(supabaseUrl, supabaseKey);

const config = {
  api: {
    bodyParser: true,
  },
};

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Download file using Supabase client
    const { data, error } = await supabase.storage
      .from("outlet-imports")
      .download("uploads/1761280094356-xtjrcl.xlsx");
    
    if (error) {
      return res.status(500).json({
        error: "Failed to download file",
        message: error.message
      });
    }
    
    const arrayBuffer = await data.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Show basic info about the data
    const dataInfo = {
      totalRows: jsonData.length,
      hasHeaders: jsonData.length > 0,
      firstRow: jsonData[0] || null,
      secondRow: jsonData[1] || null,
      thirdRow: jsonData[2] || null,
      sheetNames: workbook.SheetNames,
      firstRowLength: jsonData[0] ? jsonData[0].length : 0,
      secondRowLength: jsonData[1] ? jsonData[1].length : 0
    };

    res.status(200).json({
      success: true,
      dataInfo: dataInfo
    });

  } catch (error) {
    res.status(500).json({
      error: "Test failed",
      message: error.message,
      stack: error.stack
    });
  }
}

module.exports = handler;
module.exports.config = config;
