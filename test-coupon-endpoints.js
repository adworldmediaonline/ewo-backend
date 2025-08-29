import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8090/api';

// Test function to check coupon endpoints
async function testCouponEndpoints() {
  console.log('🧪 Testing Coupon Endpoints (No Authentication Required)...\n');

  try {
    // Test 1: Get all coupons
    console.log('1️⃣ Testing GET /api/coupon...');
    const getAllResponse = await fetch(`${BASE_URL}/coupon`);
    console.log(
      `   Status: ${getAllResponse.status} ${getAllResponse.statusText}`
    );

    if (getAllResponse.ok) {
      const coupons = await getAllResponse.json();
      console.log(`   ✅ Success! Found ${coupons.length} coupons`);
    } else {
      const error = await getAllResponse.text();
      console.log(`   ❌ Error: ${error}`);
    }

    // Test 2: Create a test coupon
    console.log('\n2️⃣ Testing POST /api/coupon/add...');
    const testCoupon = {
      title: 'Test Coupon',
      description: 'Test coupon for testing purposes',
      couponCode: 'TEST123',
      discountType: 'percentage',
      discountPercentage: 10,
      minimumAmount: 50,
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      applicableType: 'all',
      status: 'active',
    };

    const createResponse = await fetch(`${BASE_URL}/coupon/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCoupon),
    });

    console.log(
      `   Status: ${createResponse.status} ${createResponse.statusText}`
    );

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log(`   ✅ Success! Created coupon: ${result.data?.title}`);
    } else {
      const error = await createResponse.text();
      console.log(`   ❌ Error: ${error}`);
    }

    // Test 3: Check coupon availability
    console.log('\n3️⃣ Testing GET /api/coupon/check-availability/TEST123...');
    const availabilityResponse = await fetch(
      `${BASE_URL}/coupon/check-availability/TEST123`
    );
    console.log(
      `   Status: ${availabilityResponse.status} ${availabilityResponse.statusText}`
    );

    if (availabilityResponse.ok) {
      const result = await availabilityResponse.json();
      console.log(
        `   ✅ Success! Availability: ${
          result.available ? 'Available' : 'Not Available'
        }`
      );
    } else {
      const error = await availabilityResponse.text();
      console.log(`   ❌ Error: ${error}`);
    }

    // Test 4: Get valid coupons (public endpoint)
    console.log('\n4️⃣ Testing GET /api/coupon/valid/list...');
    const validResponse = await fetch(`${BASE_URL}/coupon/valid/list`);
    console.log(
      `   Status: ${validResponse.status} ${validResponse.statusText}`
    );

    if (validResponse.ok) {
      const result = await validResponse.json();
      console.log(
        `   ✅ Success! Found ${result.data?.length || 0} valid coupons`
      );
    } else {
      const error = await validResponse.text();
      console.log(`   ❌ Error: ${error}`);
    }

    console.log('\n🎉 Testing completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the tests
testCouponEndpoints();
