// Test individual dependencies
const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  try {
    // Test @supabase/supabase-js
    const { createClient } = require("@supabase/supabase-js");
    results.tests.supabase = "✅ Working";
  } catch (error) {
    results.tests.supabase = `❌ Error: ${error.message}`;
  }

  try {
    // Test xlsx
    const XLSX = require("xlsx");
    results.tests.xlsx = "✅ Working";
  } catch (error) {
    results.tests.xlsx = `❌ Error: ${error.message}`;
  }

  try {
    // Test csv-parser
    const csv = require("csv-parser");
    results.tests.csvParser = "✅ Working";
  } catch (error) {
    results.tests.csvParser = `❌ Error: ${error.message}`;
  }

  try {
    // Test fs-extra
    const fs = require("fs-extra");
    results.tests.fsExtra = "✅ Working";
  } catch (error) {
    results.tests.fsExtra = `❌ Error: ${error.message}`;
  }

  try {
    // Test node-fetch
    const fetch = require("node-fetch");
    results.tests.nodeFetch = "✅ Working";
  } catch (error) {
    results.tests.nodeFetch = `❌ Error: ${error.message}`;
  }

  res.status(200).json(results);
}

module.exports = handler;
module.exports.config = config;
