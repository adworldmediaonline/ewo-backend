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
 * Generate CSV file from products data
 */
const generateProductsCSV = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully!\n');

    // Fetch all products with required fields
    // Note: Include parent fields (shipping, seo) to access nested properties
    const products = await Products.find({}).select({
      parent: 1,
      children: 1,
      sku: 1,
      slug: 1,
      title: 1,
      description: 1,
      finalPriceDiscount: 1,
      shipping: 1,
      seo: 1,
    }).lean();

    console.log(`📦 Found ${products.length} products to export\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found. Exiting...');
      return;
    }

    // CSV Headers
    const headers = [
      'parent',
      'children',
      'sku',
      'slug',
      'title',
      'description',
      'finalPriceDiscount',
      'shipping.price',
      'seo.metaDescription',
      'seo.metaKeywords',
      'seo.metaTitle',
    ];

    // Create CSV content
    const csvRows = [headers.join(',')];

    // Add product data rows
    products.forEach((product) => {
      // Build full product URL from slug
      const productUrl = product.slug
        ? `https://www.eastwestoffroad.com/product/${product.slug}`
        : '';

      const row = [
        escapeCsvField(product.parent || ''),
        escapeCsvField(product.children || ''),
        escapeCsvField(product.sku || ''),
        escapeCsvField(productUrl),
        escapeCsvField(product.title || ''),
        escapeCsvField(product.description || ''),
        escapeCsvField(product.finalPriceDiscount || ''),
        escapeCsvField(product.shipping?.price || ''),
        escapeCsvField(product.seo?.metaDescription || ''),
        escapeCsvField(product.seo?.metaKeywords || ''),
        escapeCsvField(product.seo?.metaTitle || ''),
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `products-export-${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);

    // Write CSV file
    fs.writeFileSync(filepath, csvContent, 'utf8');

    console.log('✅ CSV file generated successfully!');
    console.log(`📄 File location: ${filepath}`);
    console.log(`📊 Total products exported: ${products.length}\n`);

    // Show sample of first product
    if (products.length > 0) {
      const sample = products[0];
      console.log('📋 Sample product data:');
      console.log(`   SKU: ${sample.sku || 'N/A'}`);
      console.log(`   Title: ${sample.title || 'N/A'}`);
      console.log(`   Parent: ${sample.parent || 'N/A'}`);
      console.log(`   Children: ${sample.children || 'N/A'}`);
      console.log(`   Final Price: $${sample.finalPriceDiscount || '0.00'}`);
      console.log(`   Shipping Price: $${sample.shipping?.price || '0.00'}\n`);
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

generateProductsCSV();

