// Delete all outlets from the database
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed. Use DELETE." });
  }

  try {
    // Delete all outlets
    const { data, error } = await supabase
      .from("outlets")
      .delete()
      .neq("id", 0); // Delete all rows (id is never 0)

    if (error) {
      return res.status(500).json({
        error: "Failed to delete outlets",
        message: error.message,
        details: error
      });
    }

    res.status(200).json({
      success: true,
      message: "All outlets deleted successfully",
      deletedCount: data?.length || "unknown"
    });

  } catch (error) {
    res.status(500).json({
      error: "Delete failed",
      message: error.message,
      stack: error.stack
    });
  }
}

module.exports = handler;
module.exports.config = config;
