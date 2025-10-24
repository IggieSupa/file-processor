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
    // Test 1: Check if outlets table exists and get its schema
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .ilike("table_name", "%outlet%");

    // Test 2: Try to get table schema
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_schema", "public")
      .eq("table_name", "outlets");

    // Test 3: Try a simple insert with minimal data
    const testData = {
      id: 1,
      name: "Test Outlet",
      created_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from("outlets")
      .insert([testData])
      .select();

    // Test 4: Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from("pg_policies")
      .select("tablename, policyname, permissive, roles, cmd, qual")
      .eq("tablename", "outlets");

    res.status(200).json({
      success: true,
      tests: {
        tables: tables || [],
        tablesError: tablesError?.message,
        columns: columns || [],
        columnsError: columnsError?.message,
        insertTest: {
          data: insertData,
          error: insertError?.message,
          details: insertError
        },
        policies: policies || [],
        policiesError: policiesError?.message
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
