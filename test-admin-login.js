import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8090/api';

// Test admin login and token generation
async function testAdminLogin() {
  console.log('🔐 Testing Admin Login...\n');

  try {
    // Test admin login
    console.log('1️⃣ Testing POST /api/admin/login...');
    const loginData = {
      email: 'admin@ewo.com', // Replace with actual admin email
      password: 'admin123', // Replace with actual admin password
    };

    const loginResponse = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    console.log(
      `   Status: ${loginResponse.status} ${loginResponse.statusText}`
    );

    if (loginResponse.ok) {
      const result = await loginResponse.json();
      console.log(`   ✅ Login successful!`);
      console.log(`   Token: ${result.data?.token ? 'Present' : 'Missing'}`);
      console.log(
        `   User: ${result.data?.user?.name} (${result.data?.user?.role})`
      );

      // Test using the token to access admin endpoints
      if (result.data?.token) {
        console.log('\n2️⃣ Testing admin endpoint with token...');
        const adminResponse = await fetch(`${BASE_URL}/admin/all`, {
          headers: {
            Authorization: `Bearer ${result.data.token}`,
          },
        });

        console.log(
          `   Admin endpoint status: ${adminResponse.status} ${adminResponse.statusText}`
        );
        if (adminResponse.ok) {
          console.log(`   ✅ Admin endpoint accessible with token!`);
        } else {
          const error = await adminResponse.text();
          console.log(`   ❌ Admin endpoint error: ${error}`);
        }
      }
    } else {
      const error = await loginResponse.text();
      console.log(`   ❌ Login failed: ${error}`);
    }

    console.log('\n🎉 Admin login test completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the tests
testAdminLogin();
