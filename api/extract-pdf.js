// PDF OCR Extraction API
// This API extracts text from PDF files stored in Supabase Storage
const { createClient } = require("@supabase/supabase-js");
const PDFParser = require("pdf2json");

// Supabase configuration
const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MzgwNiwiZXhwIjoyMDcyNDU5ODA2fQ.jc4SR2v3HIBGUMHQDYE9BcAzbo8PGkUDWFmNr2eSN4s";

const supabase = createClient(supabaseUrl, supabaseKey);

// Configure API route for Vercel
const config = {
  api: {
    bodyParser: true,
  },
};

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

// Function to extract text from PDF
async function extractTextFromPDF(pdfBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser(null, 1);
      
      pdfParser.on("pdfParser_dataError", (errData) => {
        reject(new Error(`Failed to parse PDF: ${errData.parserError}`));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          // Extract text from all pages
          let extractedText = "";
          let numPages = 0;

          if (pdfData.Pages && pdfData.Pages.length > 0) {
            numPages = pdfData.Pages.length;
            pdfData.Pages.forEach((page, index) => {
              if (page.Texts && page.Texts.length > 0) {
                page.Texts.forEach((text) => {
                  if (text.R) {
                    text.R.forEach((run) => {
                      if (run.T) {
                        // Decode URI component if needed
                        try {
                          extractedText += decodeURIComponent(run.T) + " ";
                        } catch (e) {
                          extractedText += run.T + " ";
                        }
                      }
                    });
                  }
                });
              }
            });
          }

          resolve({
            text: extractedText.trim(),
            numPages: numPages,
            info: pdfData.Meta || {},
            metadata: {},
          });
        } catch (error) {
          reject(new Error(`Failed to process PDF data: ${error.message}`));
        }
      });

      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      reject(new Error(`Failed to extract text from PDF: ${error.message}`));
    }
  });
}

// Function to download PDF from Supabase Storage URL
async function downloadPDFFromStorage(fileUrl) {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split("/storage/v1/object/public/");
    if (urlParts.length !== 2) {
      throw new Error("Invalid Supabase Storage URL format");
    }

    const filePath = urlParts[1];
    const pathParts = filePath.split("/");
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join("/");

    // Download file using Supabase client
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    // Convert data to buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(`Error downloading PDF from storage: ${error.message}`);
  }
}

// Main API handler
async function handler(req, res) {
  // Set CORS headers first
  setCORSHeaders(res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Only handle Supabase Storage URL requests
    if (!req.headers["content-type"]?.includes("application/json")) {
      return res.status(400).json({
        error:
          "This API only accepts Supabase Storage URLs. Please send JSON with fileUrl and fileName.",
      });
    }

    const body = req.body;
    const { fileUrl, fileName } = body;

    if (!fileUrl) {
      return res.status(400).json({
        error: "fileUrl is required. Please provide a Supabase Storage URL.",
      });
    }

    // Verify it's a PDF file
    if (
      !fileUrl.toLowerCase().endsWith(".pdf") &&
      !fileName?.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(400).json({
        error: "This API only supports PDF files.",
      });
    }

    console.log(`Downloading PDF from: ${fileUrl}`);

    // Download PDF from Supabase Storage
    const pdfBuffer = await downloadPDFFromStorage(fileUrl);
    console.log(`PDF downloaded, size: ${pdfBuffer.length} bytes`);

    // Extract text from PDF
    const extractedData = await extractTextFromPDF(pdfBuffer);
    console.log(
      `Text extracted successfully, pages: ${extractedData.numPages}`
    );

    // Return extracted text
    res.status(200).json({
      success: true,
      message: "Text extracted successfully from PDF",
      data: {
        fileName: fileName || "document.pdf",
        numPages: extractedData.numPages,
        text: extractedData.text,
        info: extractedData.info,
        metadata: extractedData.metadata,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

module.exports = handler;
module.exports.config = config;
