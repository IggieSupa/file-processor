// Debug Excel data processing
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const fetch = require("node-fetch");

const supabaseUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHBxcHRzc2t3bmp0bHNncndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MzgwNiwiZXhwIjoyMDcyNDU5ODA2fQ.jc4SR2v3HIBGUMHQDYE9BcAzbo8PGkUDWFmNr2eSN4s";

const supabase = createClient(supabaseUrl, supabaseKey);

const config = {
  api: {
    bodyParser: true,
  },
};

// Helper function to convert headers to snake_case
function toSnakeCase(str) {
  return str
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

// Mapping from Excel headers to database column names
const headerMapping = {
  "Outlet Name": "outlet_name",
  "Outlet": "outlet_name", 
  "Name": "outlet_name",
  "STP": "stp",
  "Sales Region": "sales_region",
  "Sales District": "sales_district",
  "Sales District Code": "sales_district_code",
  "Plant": "plant",
  "Plant Code": "plant_code",
  "Sales Area": "sales_area",
  "Sales Area Code": "sales_area_code",
  "Sales Team": "sales_team",
  "Sales Team Code": "sales_team_code",
  "Sales Sector": "sales_sector",
  "Sales Sector Code": "sales_sector_code",
  "Sales Contact Name": "sales_contact_name",
  "Sales Contact Surname": "sales_contact_surnam",
  "Sales Contact Telephone": "sales_contact_teleph",
  "Sold To Party": "sold_to_party",
  "Street Name": "street_name",
  "Street": "street_name",
  "Address": "street_name",
  "BAS Street 4": "bas_street_4",
  "BAS Street 5": "bas_street_5",
  "Latitude": "latitude",
  "Longitude": "longitude",
  "Postal Code": "postal_code",
  "Geographical Location": "geographical_location",
  "Licence Type": "licence_type",
  "License Type": "licence_type",
  "License Number": "license_number",
  "Licence Number": "license_number",
  "Created On": "created_on",
  "Account Group Code": "account_group_code",
  "Account Group": "account_group",
  "Segment": "segment",
  "Sub Segment": "sub_segment",
  "Beer Category Strategy": "beer_category_strategy",
  "Local Channel": "local_channel",
  "Call Frequency": "call_frequency",
  "National Group Code": "national_group_code",
  "National Group": "national_group",
  "Regional Group": "regional_group",
  "Regional Group Code": "regional_group_code",
  "Dead Dying Indicator": "dead_dying_indicator",
  "TSP Call Frequency": "tsp_call_frequency",
  "TSP Call Duration": "tsp_call_duration",
  "TSP Rep Type": "tsp_rep_type",
  "HE Outlet": "he_outlet",
  "Delivery Code": "delivery_code",
  "Merchandising Call": "merchandising_call",
  "Bees Registered": "bees_registered",
  "Bees Registration Date": "bees_registration_date",
  "Licence Expiry Date 1": "licence_expiry_date_1",
  "License Expiry Date 1": "licence_expiry_date_1",
  "Payer Number": "payer_number",
  "Payment Terms": "payment_terms",
  "Payment Method": "payment_method",
  "License Expiry Date 2": "license_expiry_date_2",
  "Delivery Long": "delivery_long",
  "Delivery Lat": "delivery_lat",
  "Delivery Longitude": "delivery_long",
  "Delivery Latitude": "delivery_lat",
  "Ind Delivery On Mon": "ind_delivery_on_mon",
  "Ind Delivery On Tue": "ind_delivery_on_tue",
  "Ind Delivery On Wed": "ind_delivery_on_wed",
  "Ind Delivery On Thu": "ind_delivery_on_thu",
  "Ind Delivery On Fri": "ind_delivery_on_fri",
  "Ind Delivery On Sat": "ind_delivery_on_sat",
  "Ind Delivery On Sun": "ind_delivery_on_sun",
  "Draught Outlet": "draught_outlet",
  "Fridge Outlet": "fridge_outlet"
};

// Function to map Excel header to database column name
function mapHeaderToColumn(header) {
  if (headerMapping[header]) {
    return headerMapping[header];
  }
  
  const lowerHeader = header.toLowerCase().trim();
  for (const [excelHeader, dbColumn] of Object.entries(headerMapping)) {
    if (excelHeader.toLowerCase().trim() === lowerHeader) {
      return dbColumn;
    }
  }
  
  return toSnakeCase(header);
}

// Helper function to clean and validate data
function cleanData(row, headers) {
  const cleanedRow = {};

  headers.forEach((header, index) => {
    const key = mapHeaderToColumn(header);
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
    const fileUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co/storage/v1/object/public/outlet-imports/uploads/1761243273971-jv2kz.xlsx";
    
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = jsonData[0];
    const sampleRow = jsonData[1]; // Get first data row

    // Show original headers
    const originalHeaders = headers.slice(0, 20); // First 20 headers

    // Show converted headers
    const convertedHeaders = headers.slice(0, 20).map(h => mapHeaderToColumn(h));

    // Show cleaned data for first row
    const cleanedData = cleanData(sampleRow, headers);
    const cleanedDataKeys = Object.keys(cleanedData).slice(0, 20);

    // Try to insert the first row to see what error we get
    const { data: insertData, error: insertError } = await supabase
      .from("outlets")
      .insert([cleanedData])
      .select();

    res.status(200).json({
      success: true,
      debug: {
        originalHeaders: originalHeaders,
        convertedHeaders: convertedHeaders,
        cleanedDataKeys: cleanedDataKeys,
        sampleCleanedData: Object.fromEntries(
          Object.entries(cleanedData).slice(0, 10)
        ),
        insertTest: {
          data: insertData,
          error: insertError?.message,
          details: insertError
        }
      }
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
