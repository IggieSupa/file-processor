// Simple test API to verify deployment
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

  res.status(200).json({
    success: true,
    message: "Test API is working!",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}

module.exports = handler;
module.exports.config = config;
