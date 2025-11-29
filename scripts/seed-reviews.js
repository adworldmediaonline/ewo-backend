import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Reviews from '../model/Review.js';
import Products from '../model/Products.js';

dotenv.config();


const PRODUCT_SKU = 'E90102';
const REVIEWS_DATA = [
  {
    rating: 5,
    comment:
      "Passenger arm for my K30 Dana 44 high steer. USA made, 1.25 thick with domestic billet blocks. Reamed for drag link and 1-ton TRE. All hardware included.",
    guestName: 'Daniel Brooks',
  },
  {
    rating: 4.5,
    comment: 'Solid passenger arm. Hardware included is quality.',
    guestName: 'Mike Patterson',
  },
  {
    rating: 5,
    comment: 'Perfect for Dana 44 crossover. USA-made quality.',
    guestName: 'Kevin Rodriguez',
  },
  {
    rating: 5,
    comment:
      "Installing on my square body Dana 44. Arm is 1.25 thick, pre-reamed for drag link and tie rod end. All studs, washers, and nuts included. USA made.",
    guestName: 'Rachel Thompson',
  },
  {
    rating: 4.5,
    comment: 'Quality passenger arm for high steer. Pre-reamed saves time.',
    guestName: 'Steve Morrison',
  },
  {
    rating: 5,
    comment: 'Heavy duty arm. 1.25 thick is serious quality.',
    guestName: 'Sarah Bennett',
  },
  {
    rating: 5,
    comment:
      "Dana 44 passenger arm for my CJ. USA made with domestic billet blocks. Reamed for 7/8-18 drag link and 1-ton tie rod end. Complete hardware kit included.",
    guestName: 'Jason Miller',
  },
  {
    rating: 4.5,
    comment:
      "Running this arm for about 350 miles on my K20 Dana 44. Heavy duty construction, pre-reamed, all hardware fit perfect. USA made quality shows.",
    guestName: 'Jennifer Foster',
  },
  {
    rating: 5,
    comment: 'Best passenger arm. All mounting hardware included.',
    guestName: 'Brian Carter',
  },
  {
    rating: 5,
    comment:
      "Passenger side arm for my GMC Dana 44. 1.25 inch thick made with domestic billet blocks. Pre-reamed for drag link and tie rod ends. Complete with studs, washers, and lock nuts.",
    guestName: 'Amanda Wright',
  },
  {
    rating: 4.5,
    comment: 'Quality arm with complete hardware. USA made.',
    guestName: 'Marcus Williams',
  },
];

// ========================================
// Helper Functions
// ========================================

const getRandomDate = () => {
  const now = new Date();
  const maxDaysAgo = 179;
  const daysAgo = Math.floor(Math.random() * (maxDaysAgo + 1)); // 0 to 179
  const randomDate = new Date(now);
  randomDate.setDate(now.getDate() - daysAgo);
  // Add random hour/minute/second for realism within that day
  randomDate.setHours(
    Math.floor(Math.random() * 24),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60),
    0
  );
  return randomDate;
};

const addRandomMinutes = (date, minMinutes = 0, maxMinutes = 30) => {
  const minutes =
    Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return new Date(date.getTime() + minutes * 60000);
};

// ========================================
// Main Seed Function
// ========================================

const seedReviews = async () => {
  try {
    await connectDB();


    // Find the product by SKU
    const product = await Products.findOne({ sku: PRODUCT_SKU }).select(
      '_id title sku reviews'
    );

    if (!product) {
      console.error(`❌ Product with SKU ${PRODUCT_SKU} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found product: ${product.title} (SKU: ${product.sku})`);

    const createdReviews = [];
    const reviewIds = [];

    // Create reviews
    for (const reviewData of REVIEWS_DATA) {
      // Generate realistic timestamps (spread over the last 6 months)
      const createdAt = getRandomDate(
        new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
        new Date() // today
      );
      const updatedAt = addRandomMinutes(createdAt, 5, 120); // Update 5-120 minutes after creation
      const submissionTimestamp = addRandomMinutes(createdAt, 1, 10); // Submit 1-10 minutes after creation

      const review = new Reviews({
        productId: product._id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        guestName: reviewData.guestName,
        guestEmail: `${reviewData.guestName.toLowerCase().replace(/[\s.]+/g, '.')}@example.com`,
        isFromFeedbackEmail: false,
        submissionTimestamp: submissionTimestamp,
        createdAt: createdAt,
        updatedAt: updatedAt,
      });

      const savedReview = await review.save();
      createdReviews.push(savedReview);
      reviewIds.push(savedReview._id);
      console.log(
        `✅ Created review by ${reviewData.guestName} (Rating: ${reviewData.rating})`
      );
    }

    // Update product with review IDs
    await Products.updateOne(
      { _id: product._id },
      {
        $push: {
          reviews: { $each: reviewIds },
        },
      }
    );

    console.log(
      `\n✅ Successfully seeded ${createdReviews.length} reviews for product SKU ${PRODUCT_SKU}`
    );
    console.log(`✅ Updated product with ${reviewIds.length} review IDs`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
seedReviews();

