// Test database insertion with detailed error logging
const { createClient } = require("@supabase/supabase-js");

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
    // Test 1: Try to select from outlets table to see if it exists
    const { data: selectData, error: selectError } = await supabase
      .from("outlets")
      .select("*")
      .limit(1);

    // Test 2: Try a simple insert with minimal data
    const testData = {
      name: "Test Outlet",
      created_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from("outlets")
      .insert([testData])
      .select();

    // Test 3: Try to get table info using a different approach
    const { data: tableInfo, error: tableInfoError } = await supabase
      .rpc('get_table_columns', { table_name: 'outlets' });

    res.status(200).json({
      success: true,
      tests: {
        selectTest: {
          data: selectData,
          error: selectError?.message,
          details: selectError
        },
        insertTest: {
          data: insertData,
          error: insertError?.message,
          details: insertError
        },
        tableInfo: {
          data: tableInfo,
          error: tableInfoError?.message,
          details: tableInfoError
        }
      }
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
