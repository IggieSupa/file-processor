const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  try {
    console.log('Testing CORS headers...');
    
    // Test OPTIONS request
    const optionsResponse = await fetch('http://localhost:3001/api/process-file', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://test.lovable.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('OPTIONS Response Status:', optionsResponse.status);
    console.log('CORS Headers:');
    console.log('- Access-Control-Allow-Origin:', optionsResponse.headers.get('access-control-allow-origin'));
    console.log('- Access-Control-Allow-Methods:', optionsResponse.headers.get('access-control-allow-methods'));
    console.log('- Access-Control-Allow-Headers:', optionsResponse.headers.get('access-control-allow-headers'));
    
    // Test POST request with small file
    console.log('\nTesting POST request...');
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('file', fs.createReadStream('CMD Main Market (2).xlsx'));
    
    const postResponse = await fetch('http://localhost:3001/api/process-file', {
      method: 'POST',
      body: form,
      headers: {
        'Origin': 'https://test.lovable.app'
      }
    });
    
    console.log('POST Response Status:', postResponse.status);
    console.log('Response Headers:');
    console.log('- Access-Control-Allow-Origin:', postResponse.headers.get('access-control-allow-origin'));
    
    if (postResponse.ok) {
      const result = await postResponse.json();
      console.log('Response Body:', JSON.stringify(result, null, 2));
    } else {
      const error = await postResponse.text();
      console.log('Error Response:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Wait a bit for server to start
setTimeout(testAPI, 5000);
