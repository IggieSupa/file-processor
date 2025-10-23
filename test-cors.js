// Test CORS headers
const testCORS = async () => {
  try {
    console.log('Testing CORS headers...');
    
    // Test OPTIONS preflight request
    const optionsResponse = await fetch('https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app/api/process-file', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://bcc41e06-1ce1-4e08-b6bb-df6a789eb658.lovableproject.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('OPTIONS Response Status:', optionsResponse.status);
    console.log('CORS Headers:');
    console.log('Access-Control-Allow-Origin:', optionsResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('Access-Control-Allow-Methods:', optionsResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('Access-Control-Allow-Headers:', optionsResponse.headers.get('Access-Control-Allow-Headers'));
    
    // Test actual POST request
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
    
    const postResponse = await fetch('https://file-processor-pu7el9wlf-ignatius-mutizwas-projects.vercel.app/api/process-file', {
      method: 'POST',
      body: formData,
      headers: {
        'Origin': 'https://bcc41e06-1ce1-4e08-b6bb-df6a789eb658.lovableproject.com'
      }
    });
    
    console.log('POST Response Status:', postResponse.status);
    console.log('POST CORS Headers:');
    console.log('Access-Control-Allow-Origin:', postResponse.headers.get('Access-Control-Allow-Origin'));
    
  } catch (error) {
    console.error('CORS Test Error:', error);
  }
};

testCORS();
