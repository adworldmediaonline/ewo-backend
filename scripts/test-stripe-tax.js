import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const stripe = new Stripe(process.env.STRIPE_KEY);

/**
 * Test Stripe Tax API with Washington address
 * Based on Stripe docs: https://docs.stripe.com/tax/payment-intent
 */
async function testStripeTax() {
  console.log('🧪 Testing Stripe Tax API...\n');
  console.log('Using Stripe Key:', process.env.STRIPE_KEY ? `${process.env.STRIPE_KEY.substring(0, 20)}...` : 'NOT FOUND');
  console.log('');

  try {
    // Test 1: Basic US address (Washington state - as per registration)
    console.log('📋 Test 1: Washington State Address (Seattle)');
    console.log('Address: 920 5th Ave, Seattle, WA 98104, US\n');

    const calculation1 = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: [
        {
          amount: 1000, // $10.00 in cents
          reference: 'L1',
          tax_code: 'txcd_99999999', // General merchandise
        },
      ],
      customer_details: {
        address: {
          line1: '920 5th Ave',
          city: 'Seattle',
          state: 'WA',
          postal_code: '98104',
          country: 'US',
        },
        address_source: 'shipping',
      },
    });

    console.log('✅ Calculation Response:');
    console.log(JSON.stringify(calculation1, null, 2));
    console.log('\n📊 Summary:');
    console.log(`  - Subtotal: $${(calculation1.amount_total - (calculation1.tax_amount_exclusive || 0)) / 100}`);
    console.log(`  - Tax Amount (Exclusive): $${(calculation1.tax_amount_exclusive || 0) / 100}`);
    console.log(`  - Tax Amount (Inclusive): $${(calculation1.tax_amount_inclusive || 0) / 100}`);
    console.log(`  - Total Amount: $${calculation1.amount_total / 100}`);
    console.log(`  - Calculation ID: ${calculation1.id}`);
    console.log(`  - Tax Breakdown Items: ${calculation1.tax_breakdown?.length || 0}`);
    
    if (calculation1.tax_breakdown && calculation1.tax_breakdown.length > 0) {
      console.log('\n  Tax Breakdown:');
      calculation1.tax_breakdown.forEach((breakdown, index) => {
        console.log(`    ${index + 1}. ${breakdown.jurisdiction?.level || 'unknown'}: ${breakdown.tax_rate_details?.percentage_decimal || 0}% = $${(breakdown.tax_amount || 0) / 100}`);
        console.log(`       Country: ${breakdown.jurisdiction?.country || 'N/A'}, State: ${breakdown.jurisdiction?.state || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 2: Bothell, WA (user's test address from console logs)
    console.log('📋 Test 2: Bothell, Washington (User Test Address)');
    console.log('Address: Bothell East, WA 98012, US\n');

    const calculation2 = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: [
        {
          amount: 7431, // $74.31 in cents (matching user's test)
          reference: 'L1',
          tax_code: 'txcd_99999999',
        },
      ],
      customer_details: {
        address: {
          line1: '123 Main St', // Using a generic address since user didn't provide street
          city: 'Bothell',
          state: 'WA',
          postal_code: '98012',
          country: 'US',
        },
        address_source: 'shipping',
      },
    });

    console.log('✅ Calculation Response:');
    console.log(JSON.stringify(calculation2, null, 2));
    console.log('\n📊 Summary:');
    console.log(`  - Subtotal: $${(calculation2.amount_total - (calculation2.tax_amount_exclusive || 0)) / 100}`);
    console.log(`  - Tax Amount (Exclusive): $${(calculation2.tax_amount_exclusive || 0) / 100}`);
    console.log(`  - Tax Amount (Inclusive): $${(calculation2.tax_amount_inclusive || 0) / 100}`);
    console.log(`  - Total Amount: $${calculation2.amount_total / 100}`);
    console.log(`  - Calculation ID: ${calculation2.id}`);
    console.log(`  - Tax Breakdown Items: ${calculation2.tax_breakdown?.length || 0}`);
    
    if (calculation2.tax_breakdown && calculation2.tax_breakdown.length > 0) {
      console.log('\n  Tax Breakdown:');
      calculation2.tax_breakdown.forEach((breakdown, index) => {
        console.log(`    ${index + 1}. ${breakdown.jurisdiction?.level || 'unknown'}: ${breakdown.tax_rate_details?.percentage_decimal || 0}% = $${(breakdown.tax_amount || 0) / 100}`);
        console.log(`       Country: ${breakdown.jurisdiction?.country || 'N/A'}, State: ${breakdown.jurisdiction?.state || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 3: Multiple line items with shipping
    console.log('📋 Test 3: Multiple Items + Shipping');
    console.log('Address: Seattle, WA 98104, US\n');

    const calculation3 = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: [
        {
          amount: 5000, // $50.00
          reference: 'L1',
          tax_code: 'txcd_99999999',
        },
        {
          amount: 2500, // $25.00
          reference: 'L2',
          tax_code: 'txcd_99999999',
        },
        {
          amount: 1000, // $10.00 shipping
          reference: 'shipping_cost',
          tax_code: 'txcd_99999999',
        },
      ],
      customer_details: {
        address: {
          line1: '920 5th Ave',
          city: 'Seattle',
          state: 'WA',
          postal_code: '98104',
          country: 'US',
        },
        address_source: 'shipping',
      },
    });

    console.log('✅ Calculation Response:');
    console.log(JSON.stringify(calculation3, null, 2));
    console.log('\n📊 Summary:');
    console.log(`  - Subtotal: $${(calculation3.amount_total - (calculation3.tax_amount_exclusive || 0)) / 100}`);
    console.log(`  - Tax Amount (Exclusive): $${(calculation3.tax_amount_exclusive || 0) / 100}`);
    console.log(`  - Total Amount: $${calculation3.amount_total / 100}`);

    console.log('\n✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('❌ Error testing Stripe Tax API:');
    console.error('Error Type:', error.type);
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Error:', JSON.stringify(error, null, 2));
    
    if (error.type === 'StripeInvalidRequestError') {
      console.error('\n💡 Possible Issues:');
      console.error('  1. Stripe Tax registrations not set up in Dashboard');
      console.error('  2. Invalid address format');
      console.error('  3. Tax code not recognized');
      console.error('  4. Account not enabled for Stripe Tax');
    }
  }
}

// Run the test
testStripeTax();
