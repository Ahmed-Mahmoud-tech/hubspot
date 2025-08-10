async function testUpdateContact() {
  try {
    const response = await fetch('http://localhost:8000/hubspot/update-contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token'
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
    
    if (response.ok) {
      console.log('Success:', data);
    } else {
      console.error('Error:', data);
    }
  } catch (error) {
    console.error('Network Error:', error.message);
  }
}

testUpdateContact();
