const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDeployedAPI() {
  const baseUrl = 'https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app';
  
  try {
    console.log('Testing deployed API CORS headers...');
    console.log('Base URL:', baseUrl);
    
    // Test OPTIONS request
    console.log('\n1. Testing OPTIONS request...');
    const optionsResponse = await fetch(`${baseUrl}/api/process-file`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://id-preview--bcc41e06-1ce1-4e08-b6bb-df6a789eb658.lovable.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('OPTIONS Response Status:', optionsResponse.status);
    console.log('CORS Headers:');
    console.log('- Access-Control-Allow-Origin:', optionsResponse.headers.get('access-control-allow-origin'));
    console.log('- Access-Control-Allow-Methods:', optionsResponse.headers.get('access-control-allow-methods'));
    console.log('- Access-Control-Allow-Headers:', optionsResponse.headers.get('access-control-allow-headers'));
    console.log('- Access-Control-Allow-Credentials:', optionsResponse.headers.get('access-control-allow-credentials'));
    
    // Test chunked upload endpoint
    console.log('\n2. Testing chunked upload endpoint OPTIONS...');
    const chunkOptionsResponse = await fetch(`${baseUrl}/api/upload-chunk`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://id-preview--bcc41e06-1ce1-4e08-b6bb-df6a789eb658.lovable.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('Chunked OPTIONS Response Status:', chunkOptionsResponse.status);
    console.log('Chunked CORS Headers:');
    console.log('- Access-Control-Allow-Origin:', chunkOptionsResponse.headers.get('access-control-allow-origin'));
    console.log('- Access-Control-Allow-Methods:', chunkOptionsResponse.headers.get('access-control-allow-methods'));
    
    // Test progress endpoint
    console.log('\n3. Testing progress endpoint...');
    const progressResponse = await fetch(`${baseUrl}/api/progress`, {
      method: 'GET',
      headers: {
        'Origin': 'https://id-preview--bcc41e06-1ce1-4e08-b6bb-df6a789eb658.lovable.app'
      }
    });
    
    console.log('Progress Response Status:', progressResponse.status);
    console.log('Progress CORS Headers:');
    console.log('- Access-Control-Allow-Origin:', progressResponse.headers.get('access-control-allow-origin'));
    
    if (progressResponse.ok) {
      const progressData = await progressResponse.text();
      console.log('Progress Response Body:', progressData);
    }
    
    console.log('\n✅ CORS test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeployedAPI();
