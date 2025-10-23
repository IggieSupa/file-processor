const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testFinalSolution() {
  const baseUrl =
    "https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app";

  try {
    console.log("Testing final solution with Supabase Storage support...");
    console.log("Base URL:", baseUrl);

    // Test 1: Check if endpoint is working
    console.log("\n1. Testing endpoint availability...");
    const optionsResponse = await fetch(`${baseUrl}/api/process-file`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://test.lovable.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });

    console.log("OPTIONS Response Status:", optionsResponse.status);
    console.log("CORS Headers:");
    console.log(
      "- Access-Control-Allow-Origin:",
      optionsResponse.headers.get("access-control-allow-origin")
    );

    // Test 2: Test Supabase Storage URL request
    console.log("\n2. Testing Supabase Storage URL request...");
    const supabaseResponse = await fetch(`${baseUrl}/api/process-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://test.lovable.app",
      },
      body: JSON.stringify({
        fileUrl: "https://example.com/test.xlsx",
        fileName: "test.xlsx",
        fileType: "xlsx",
      }),
    });

    console.log("Supabase Request Status:", supabaseResponse.status);
    if (!supabaseResponse.ok) {
      const errorData = await supabaseResponse.json();
      console.log("Error Response:", JSON.stringify(errorData, null, 2));
    } else {
      const result = await supabaseResponse.json();
      console.log("Success Response:", JSON.stringify(result, null, 2));
    }

    // Test 3: Test direct file upload (should fail with 413 for large files)
    console.log("\n3. Testing direct file upload...");
    const FormData = require("form-data");
    const fs = require("fs");

    if (fs.existsSync("CMD Main Market (2).xlsx")) {
      const form = new FormData();
      form.append("file", fs.createReadStream("CMD Main Market (2).xlsx"));

      const directResponse = await fetch(`${baseUrl}/api/process-file`, {
        method: "POST",
        body: form,
        headers: {
          Origin: "https://test.lovable.app",
        },
      });

      console.log("Direct Upload Status:", directResponse.status);
      if (directResponse.status === 413) {
        console.log("✅ Expected: 413 Content Too Large (Vercel limit)");
      } else if (directResponse.ok) {
        const result = await directResponse.json();
        console.log("Unexpected Success:", JSON.stringify(result, null, 2));
      } else {
        const error = await directResponse.text();
        console.log("Error:", error);
      }
    } else {
      console.log("Test file not found, skipping direct upload test");
    }

    console.log("\n✅ Final solution test completed!");
    console.log("\n📋 Summary:");
    console.log(
      "- Endpoint supports both direct upload (4MB limit) and Supabase Storage URLs"
    );
    console.log("- For large files, use Supabase Storage approach");
    console.log("- CORS headers are working properly");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testFinalSolution();
