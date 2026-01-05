import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Products from '../model/Products.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Escape CSV field value
 * Handles commas, quotes, and newlines in the data
 */
const escapeCsvField = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Generate CSV file with SKU and shipping price
 * Includes all items with finalPriceDiscount >= $500.00
 */
const generateSkuShippingCSV = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully!\n');

    // Fetch products with finalPriceDiscount >= 500.00
    // Select only SKU and shipping.price fields
    const products = await Products.find({
      finalPriceDiscount: { $gte: 500.00 },
    })
      .select({
        sku: 1,
        'shipping.price': 1,
        finalPriceDiscount: 1,
        title: 1, // Include for reference/debugging
      })
      .lean()
      .sort({ finalPriceDiscount: -1 }); // Sort by price descending

    console.log(`📦 Found ${products.length} products with finalPriceDiscount >= $500.00\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found matching criteria. Exiting...');
      return;
    }

    // CSV Headers
    const headers = ['sku', 'shipping.price', 'finalPriceDiscount'];

    // Create CSV content
    const csvRows = [headers.join(',')];

    // Add product data rows
    products.forEach((product) => {
      const row = [
        escapeCsvField(product.sku || ''),
        escapeCsvField(product.shipping?.price || ''),
        escapeCsvField(product.finalPriceDiscount || ''),
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `sku-shipping-export-${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);

    // Write CSV file
    fs.writeFileSync(filepath, csvContent, 'utf8');

    console.log('✅ CSV file generated successfully!');
    console.log(`📄 File location: ${filepath}`);
    console.log(`📊 Total products exported: ${products.length}\n`);

    // Show statistics
    const totalShippingPrice = products.reduce((sum, product) => {
      return sum + (Number(product.shipping?.price) || 0);
    }, 0);

    const avgShippingPrice =
      products.length > 0 ? totalShippingPrice / products.length : 0;

    const minPrice = Math.min(
      ...products.map((p) => Number(p.finalPriceDiscount) || 0)
    );
    const maxPrice = Math.max(
      ...products.map((p) => Number(p.finalPriceDiscount) || 0)
    );

    console.log('📋 Export Statistics:');
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Price Range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
    console.log(`   Average Shipping Price: $${avgShippingPrice.toFixed(2)}`);
    console.log(`   Total Shipping Price Sum: $${totalShippingPrice.toFixed(2)}\n`);

    // Show sample of first few products
    if (products.length > 0) {
      console.log('📋 Sample products (first 5):');
      products.slice(0, 5).forEach((product, index) => {
        console.log(
          `   ${index + 1}. SKU: ${product.sku || 'N/A'} | Shipping: $${product.shipping?.price || '0.00'} | Price: $${product.finalPriceDiscount || '0.00'}`
        );
      });
      if (products.length > 5) {
        console.log(`   ... and ${products.length - 5} more products\n`);
      }
    }
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

generateSkuShippingCSV();

