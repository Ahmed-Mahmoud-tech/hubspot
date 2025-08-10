import axios from 'axios';

// Test the update contact endpoint with debug info
async function testUpdateContact() {
  try {
    const payload = {
      contactId: "142479074834",
      apiKey: "pat-na1-b1369c01-c70b-4942-94da-3f143b46e4a0",
      fields: {
        city: "xcvbxcvb"
      }
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post('http://localhost:8000/hubspot/update-contact', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'your-jwt-token-here' // Replace with actual cookie if needed
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

testUpdateContact();
