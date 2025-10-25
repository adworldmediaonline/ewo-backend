const mongoose = require('mongoose');
const Products = require('../model/Products');

// Database connection
mongoose.connect(process.env.DB_URI || 'mongodb://localhost:27017/ewo', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateSeoKeywords() {
  try {


    // Find all products that have seo.metaKeywords as an array
    const products = await Products.find({
      'seo.metaKeywords': { $type: 'array' }
    });


    for (const product of products) {
      if (Array.isArray(product.seo.metaKeywords)) {
        // Convert array to comma-separated string
        const keywordsString = product.seo.metaKeywords.join(', ');

        // Update the product
        await Products.updateOne(
          { _id: product._id },
          {
            $set: {
              'seo.metaKeywords': keywordsString
            }
          }
        );

      }
    }

    // Also fix any products with null or undefined seo fields
    await Products.updateMany(
      { 'seo.metaKeywords': { $in: [null, undefined] } },
      { $set: { 'seo.metaKeywords': '' } }
    );

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Run migration
migrateSeoKeywords();
