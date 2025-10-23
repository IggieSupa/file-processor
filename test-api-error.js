const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testAPIError() {
  const baseUrl =
    "https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app";

  try {
    console.log("Testing API with the actual Supabase Storage URL...");
    
    // Test with the actual URL from the error
    const testUrl = "https://tphpqptsskwnjtlsgrwj.supabase.co/storage/v1/object/public/outlet-imports/uploads/1761243273971-jv2kz.xlsx";
    
    const response = await fetch(`${baseUrl}/api/process-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://bcc41e06-1ce1-4e08-b6bb-df6a789eb658.lovableproject.com",
      },
      body: JSON.stringify({
        fileUrl: testUrl,
        fileName: "CMD Main Market (2).xlsx",
        fileType: "xlsx",
      }),
    });

    console.log("Response Status:", response.status);
    console.log("Response Headers:");
    console.log("- Content-Type:", response.headers.get("content-type"));
    console.log("- Access-Control-Allow-Origin:", response.headers.get("access-control-allow-origin"));

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error Response:", errorText);
    } else {
      const result = await response.json();
      console.log("Success Response:", JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testAPIError();
