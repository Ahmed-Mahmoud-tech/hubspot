async function testEndpoint() {
  try {
    // Test basic connectivity first
    const healthResponse = await fetch('http://localhost:8000/', {
      method: 'GET'
    });
    
    console.log('Health check status:', healthResponse.status);
    
    // Now test the update-contact endpoint without auth to see the specific error
    const response = await fetch('http://localhost:8000/hubspot/update-contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactId: "142479074834",
        apiKey: "pat-na1-b1369c01-c70b-4942-94da-3f143b46e4a0",
        fields: {
          country: "cairo"
        }
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', data);
    
  } catch (error) {
    console.error('Network Error:', error.message);
  }
}

testEndpoint();
