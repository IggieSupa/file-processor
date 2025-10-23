// Test API with formidable v2.1.1
const formidable = require("formidable");

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

// Test handler
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
    // Test formidable
    console.log("Testing formidable...");
    console.log("Type of formidable:", typeof formidable);
    console.log("Is formidable a function:", typeof formidable === 'function');

    if (typeof formidable !== 'function') {
      return res.status(500).json({
        error: "Formidable is not a function",
        formidableType: typeof formidable,
        formidableKeys: Object.keys(formidable || {})
      });
    }

    // Test creating a formidable instance
    const form = formidable({
      maxFileSize: 4 * 1024 * 1024,
      uploadDir: "/tmp",
      keepExtensions: true,
    });

    res.status(200).json({
      success: true,
      message: "Formidable test successful",
      formidableType: typeof formidable,
      formType: typeof form
    });

  } catch (error) {
    console.error("Error in test handler:", error);
    res.status(500).json({
      error: "Test failed",
      message: error.message,
      formidableType: typeof formidable
    });
  }
}

module.exports = handler;
