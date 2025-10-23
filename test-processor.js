const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const csv = require("csv-parser");
const fs = require("fs-extra");
const path = require("path");

// Helper function to convert headers to snake_case
function toSnakeCase(str) {
  return str
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

// Helper function to clean and validate data
function cleanData(row, headers) {
  const cleanedRow = {};

  headers.forEach((header, index) => {
    const key = toSnakeCase(header);
    let value = row[index] || row[header] || null;

    // Clean up the value
    if (typeof value === "string") {
      value = value.trim();
      if (value === "" || value === "null" || value === "undefined") {
        value = null;
      }
    }

    // Convert specific fields to appropriate types
    if (
      key === "latitude" ||
      key === "longitude" ||
      key === "delivery_long" ||
      key === "delivery_lat"
    ) {
      value = value ? parseFloat(value) : null;
    }

    if (
      key === "call_frequency" ||
      key === "tsp_call_frequency" ||
      key === "tsp_call_duration"
    ) {
      value = value ? parseInt(value) : null;
    }

    if (
      key.includes("ind_delivery") ||
      key === "dead_dying_indicator" ||
      key === "he_outlet" ||
      key === "merchandising_call" ||
      key === "bees_registered" ||
      key === "draught_outlet" ||
      key === "fridge_outlet"
    ) {
      if (typeof value === "string") {
        value =
          value.toLowerCase() === "true" ||
          value.toLowerCase() === "yes" ||
          value === "1";
      }
    }

    if (key.includes("date") || key === "created_on") {
      if (value) {
        const date = new Date(value);
        value = isNaN(date.getTime()) ? null : date.toISOString();
      }
    }

    cleanedRow[key] = value;
  });

  return cleanedRow;
}

// Function to process XLSX file
async function processXLSX(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      throw new Error("No data found in the file");
    }

    const headers = jsonData[0];
    const rows = jsonData.slice(1);

    return { headers, rows };
  } catch (error) {
    throw new Error(`Error processing XLSX file: ${error.message}`);
  }
}

// Function to process CSV file
async function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const headers = [];
    let isFirstRow = true;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        if (isFirstRow) {
          headers.push(...Object.keys(data));
          isFirstRow = false;
        }
        results.push(Object.values(data));
      })
      .on("end", () => {
        resolve({ headers, rows: results });
      })
      .on("error", (error) => {
        reject(new Error(`Error processing CSV file: ${error.message}`));
      });
  });
}

// Function to create JSON batches (TEST VERSION - NO SUPABASE SEEDING)
async function createJSONBatches(rows, headers, batchSize = 1000) {
  const batches = [];
  const totalBatches = Math.ceil(rows.length / batchSize);

  console.log(
    `\n📊 Processing ${rows.length} rows in ${totalBatches} batches of ${batchSize} rows each...\n`
  );

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, rows.length);
    const batchRows = rows.slice(start, end);

    console.log(
      `🔄 Processing batch ${i + 1}/${totalBatches} (rows ${
        start + 1
      }-${end})...`
    );

    const processedRows = batchRows.map((row) => cleanData(row, headers));

    const batchData = {
      batch_number: i + 1,
      total_batches: totalBatches,
      rows_in_batch: processedRows.length,
      created_at: new Date().toISOString(),
      data: processedRows,
    };

    const fileName = `outlets_batch_${i + 1}_of_${totalBatches}.json`;
    const filePath = path.join("./test-output", fileName);

    // Ensure test-output directory exists
    await fs.ensureDir("./test-output");
    await fs.writeJson(filePath, batchData, { spaces: 2 });

    batches.push({
      fileName,
      filePath,
      batchNumber: i + 1,
      rowCount: processedRows.length,
    });

    console.log(
      `✅ Batch ${i + 1} created: ${fileName} (${processedRows.length} rows)`
    );
  }

  return batches;
}

// Main test function
async function testFileProcessing() {
  try {
    console.log("🚀 Starting File Processing Test...\n");

    // Check if test file exists
    const testFile = "./CMD Main Market (2).xlsx"; // Your actual file
    if (!fs.existsSync(testFile)) {
      console.log(
        "❌ Test file not found. Please add your test file as 'test-data.xlsx' or 'test-data.csv'"
      );
      console.log("Available files in current directory:");
      const files = fs.readdirSync(".");
      files.forEach((file) => {
        if (file.endsWith(".xlsx") || file.endsWith(".csv")) {
          console.log(`  📄 ${file}`);
        }
      });
      return;
    }

    const fileExtension = path.extname(testFile).toLowerCase();
    console.log(`📁 Processing file: ${testFile}`);
    console.log(`📋 File type: ${fileExtension.toUpperCase()}\n`);

    // Process the file based on type
    let headers, rows;

    if (fileExtension === ".xlsx") {
      ({ headers, rows } = await processXLSX(testFile));
    } else if (fileExtension === ".csv") {
      ({ headers, rows } = await processCSV(testFile));
    } else {
      throw new Error("Unsupported file type. Please use .xlsx or .csv files.");
    }

    console.log(`📊 File processed successfully!`);
    console.log(`   Headers: ${headers.length}`);
    console.log(`   Rows: ${rows.length}`);
    console.log(`   Headers: ${headers.join(", ")}\n`);

    // Show first few rows as sample
    console.log("🔍 Sample data (first 3 rows):");
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      console.log(`   Row ${i + 1}:`, rows[i].slice(0, 5).join(" | "), "...");
    }
    console.log("");

    // Create JSON batches
    const batches = await createJSONBatches(rows, headers);

    // Show summary
    console.log("\n📈 TEST SUMMARY:");
    console.log(`   Total rows processed: ${rows.length}`);
    console.log(`   Total batches created: ${batches.length}`);
    console.log(`   Files created in: ./test-output/`);
    console.log(
      `   Average rows per batch: ${Math.round(rows.length / batches.length)}`
    );

    // Show sample of processed data
    if (batches.length > 0) {
      const firstBatch = await fs.readJson(batches[0].filePath);
      console.log("\n🔍 Sample processed data (first row from first batch):");
      const sampleRow = firstBatch.data[0];
      Object.entries(sampleRow)
        .slice(0, 10)
        .forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      if (Object.keys(sampleRow).length > 10) {
        console.log(
          `   ... and ${Object.keys(sampleRow).length - 10} more fields`
        );
      }
    }

    console.log(
      "\n✅ Test completed successfully! No data was seeded to Supabase."
    );
    console.log(
      "📁 Check the ./test-output/ directory for generated JSON files."
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testFileProcessing();
