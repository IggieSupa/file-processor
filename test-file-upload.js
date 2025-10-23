const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');

async function testFileUpload() {
  const baseUrl = 'https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app';
  
  try {
    console.log('Testing file upload to deployed API...');
    console.log('Base URL:', baseUrl);
    
    // Check if test file exists
    const testFile = 'CMD Main Market (2).xlsx';
    if (!fs.existsSync(testFile)) {
      console.log('❌ Test file not found:', testFile);
      return;
    }
    
    const fileStats = fs.statSync(testFile);
    console.log(`📁 Test file: ${testFile} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    
    console.log('\n🚀 Uploading file...');
    const response = await fetch(`${baseUrl}/api/process-file`, {
      method: 'POST',
      body: form,
      headers: {
        'Origin': 'https://id-preview--bcc41e06-1ce1-4e08-b6bb-df6a789eb658.lovable.app'
      }
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:');
    console.log('- Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('- Content-Type:', response.headers.get('content-type'));
    console.log('- Content-Length:', response.headers.get('content-length'));
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Upload successful!');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('\n❌ Upload failed!');
      console.log('📋 Error Response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFileUpload();
