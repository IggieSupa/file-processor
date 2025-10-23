const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testAllEndpoints() {
  const baseUrl =
    "https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app";

  const endpoints = [
    "/api/process-file",
    "/api/upload-chunk",
    "/api/upload-stream",
    "/api/upload-supabase",
    "/api/progress",
    "/api/job-status",
  ];

  console.log("Testing all endpoints...");
  console.log("Base URL:", baseUrl);

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint}...`);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://test.lovable.app",
        },
      });

      console.log(`   Status: ${response.status}`);
      console.log(
        `   CORS Origin: ${response.headers.get("access-control-allow-origin")}`
      );

      if (response.status === 404) {
        console.log(`   ❌ Not found`);
      } else if (response.status === 200) {
        console.log(`   ✅ Available`);
      } else {
        console.log(`   ⚠️  Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log("\n✅ All endpoints tested!");
}

testAllEndpoints();
