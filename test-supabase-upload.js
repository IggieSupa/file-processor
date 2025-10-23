const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testSupabaseUpload() {
  const baseUrl =
    "https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app";

  try {
    console.log("Testing Supabase Storage upload solution...");
    console.log("Base URL:", baseUrl);

    // Test 1: Check if the new endpoint exists
    console.log("\n1. Testing endpoint availability...");
    const optionsResponse = await fetch(`${baseUrl}/api/upload-supabase`, {
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

    // Test 2: Test with invalid request (no file URL)
    console.log("\n2. Testing with invalid request...");
    const invalidResponse = await fetch(`${baseUrl}/api/upload-supabase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://test.lovable.app",
      },
      body: JSON.stringify({}),
    });

    console.log("Invalid Request Status:", invalidResponse.status);
    if (!invalidResponse.ok) {
      const errorData = await invalidResponse.json();
      console.log("Error Response:", JSON.stringify(errorData, null, 2));
    }

    // Test 3: Test with mock file URL
    console.log("\n3. Testing with mock file URL...");
    const mockResponse = await fetch(`${baseUrl}/api/upload-supabase`, {
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

    console.log("Mock Request Status:", mockResponse.status);
    if (!mockResponse.ok) {
      const errorData = await mockResponse.json();
      console.log("Error Response:", JSON.stringify(errorData, null, 2));
    } else {
      const result = await mockResponse.json();
      console.log("Success Response:", JSON.stringify(result, null, 2));
    }

    console.log("\n✅ Supabase upload endpoint test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testSupabaseUpload();
