// Debug raw Excel data
const XLSX = require("xlsx");
const fetch = require("node-fetch");

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
    // Process the Excel file
    const fileUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co/storage/v1/object/public/outlet-imports/uploads/1761280094356-xtjrcl.xlsx";
    
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
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
      lastRow: jsonData[jsonData.length - 1] || null,
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
      error: "Debug failed",
      message: error.message,
      stack: error.stack
    });
  }
}

module.exports = handler;
module.exports.config = config;
