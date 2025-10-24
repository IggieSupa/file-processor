// Test Supabase connection and storage
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODM4MDYsImV4cCI6MjA3MjQ1OTgwNn0.Za_gtehw-0gNdvzHWshXKXiS7AkDON6kSOKCDpsReJg";

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
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return res.status(500).json({
        error: "Failed to list buckets",
        message: bucketsError.message
      });
    }

    // Try to create the outlet-imports bucket if it doesn't exist
    const bucketExists = buckets.some(bucket => bucket.name === 'outlet-imports');
    
    if (!bucketExists) {
      const { data: createData, error: createError } = await supabase.storage.createBucket('outlet-imports', {
        public: true
      });
      
      if (createError) {
        return res.status(500).json({
          error: "Failed to create bucket",
          message: createError.message,
          buckets: buckets.map(b => b.name)
        });
      }
    }

    // List files in outlet-imports bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('outlet-imports')
      .list('uploads', { limit: 10 });

    res.status(200).json({
      success: true,
      buckets: buckets.map(b => ({ name: b.name, public: b.public })),
      outletImportsFiles: files || [],
      bucketCreated: !bucketExists
    });

  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
}

module.exports = handler;
module.exports.config = config;
