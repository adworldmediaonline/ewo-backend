import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Reviews from '../model/Review.js';
import Products from '../model/Products.js';

dotenv.config();

// ========================================
// CHANGE SKU HERE
// ========================================
const PRODUCT_SKU = 'E90063'; // Change this to seed reviews for different products

// ========================================
// CHANGE REVIEWS DATA HERE
// ========================================
const REVIEWS_DATA = [
  {
    rating: 5,
    comment: 'Complete kit with standard and offset TREs. Great flexibility.',
    guestName: 'Derek Johnson',
  },
  {
    rating: 5,
    comment: 'Perfect for Dana 60. Both standard and offset ends included.',
    guestName: 'Sarah M.',
  },
  {
    rating: 4.5,
    comment: 'Quality kit. Love having both options in one package.',
    guestName: 'Marcus Wilson',
  },
  {
    rating: 5,
    comment:
      "This complete steering kit for Dana 60 is excellent. You get ES 2234 R & L standard tie rods AND ES 23434 R & L offset tie rods, plus all tube adapters and jam nuts (2 LH, 2 RH of each). Having both standard and offset options in one kit gives great flexibility for different steering setups.",
    guestName: 'Jennifer Martinez',
  },
  {
    rating: 5,
    comment: 'Complete kit for Dana 44. All adapters included.',
    guestName: 'Robert T.',
  },
  {
    rating: 4.5,
    comment:
      "Quality steering kit for Dana 44/Dana 60 1-ton axles. Includes ES 2234 standard and ES 23434 offset tie rod ends (both left and right), 2 LH tube adapters, 2 RH tube adapters, 2 LH jam nuts, and 2 RH jam nuts. Metal-on-metal construction with spring technology for durability. Great for on-road and off-road.",
    guestName: 'Amanda Foster',
  },
  {
    rating: 5,
    comment:
      "Installing this complete kit on my K3500 with Dana 60. What makes this stand out is you get BOTH standard ES 2234 R & L tie rods AND offset ES 23434 R & L tie rods in one package. Plus all the required adapters and jam nuts (2 left, 2 right of each). Designed for Dana 44/Dana 60 1-ton axles. Straightforward assembly with all hardware included.",
    guestName: 'Christopher Davis',
  },
  {
    rating: 5,
    comment:
      "Building a complete steering system on my GMC with Dana 44 and this kit is perfect. You get 1 ES 2234 R standard right, 1 ES 2234 L standard left, 1 ES 23434 R offset right, 1 ES 23434 L offset left, 2 LH tube adapters, 2 RH tube adapters, 2 LH jam nuts, and 2 RH jam nuts. Having both standard and offset tie rod ends gives flexibility for different steering configurations. Metal-on-metal construction with spring technology provides increased durability. After installation and about 180 miles including trail use, steering accuracy is excellent. Great value for a complete kit.",
    guestName: 'Nicole Parker',
  },
  {
    rating: 4.5,
    comment:
      "Quality complete steering kit for Dana 60 on my Chevy K2500. This kit includes everything - standard ES 2234 tie rods (R & L) and offset ES 23434 tie rods (R & L), plus all required adapters and jam nuts. The kit is designed specifically for Dana 44/Dana 60 1-ton axles and comes with all hardware for straightforward assembly. Metal-on-metal construction with spring technology is built for durability and can handle on-road and off-road driving. Having both standard and offset options in one kit is great for flexibility. After about 200 miles including some off-road use, steering agility is excellent. Good value for a comprehensive kit.",
    guestName: 'Steven Phillips',
  },
  {
    rating: 5,
    comment:
      "Installing this complete steering kit on my K3500 Dana 60 front end. This is a comprehensive kit that includes 1 ES 2234 R standard right tie rod, 1 ES 2234 L standard left tie rod, 1 ES 23434 R offset right tie rod end, 1 ES 23434 L offset left tie rod end, 2 7/8-18 LH tube adapters, 2 7/8-18 RH tube adapters, 2 7/8-18 LH jam nuts, and 2 7/8-18 RH jam nuts. What sets this kit apart is having BOTH standard and offset tie rod ends in one package, giving you flexibility for different steering setups. The kit is designed specifically for Dana 44/Dana 60 1-ton axles. Metal-on-metal construction with spring technology provides increased durability for on-road and off-road capability. All required adapters and jam nuts are included for straightforward assembly. After installation, alignment, and about 220 miles of mixed driving including aggressive off-road trails, steering accuracy and agility are outstanding. All components are holding up great with no play or binding. Having both standard and offset options plus all hardware in one complete kit saved ordering multiple items. This is a complete solution for Dana 44/Dana 60 steering upgrades. Excellent value.",
    guestName: 'Patricia Wilson',
  },
  {
    rating: 5,
    comment: 'Top kit. Both standard and offset in one package.',
    guestName: 'Brian K.',
  },
  {
    rating: 4.5,
    comment:
      "I do steering upgrades on Dana 44 and Dana 60 axles and this complete kit is excellent. The kit includes 1 ES 2234 R standard right, 1 ES 2234 L standard left, 1 ES 23434 R offset right, 1 ES 23434 L offset left, 2 LH tube adapters, 2 RH tube adapters, 2 LH jam nuts, and 2 RH jam nuts. Having both standard ES 2234 and offset ES 23434 tie rod ends in one kit gives great flexibility for different steering configurations. The kit is designed specifically for Dana 44/Dana 60 1-ton axles and comes with all required adapters and jam nuts for straightforward assembly. Metal-on-metal construction with spring technology is built for increased durability and can handle on-road and off-road driving. I've used these on several customer builds and they work great. After weeks of testing on different trucks including heavy off-road use, they've all performed well with excellent steering accuracy and agility. Having both standard and offset options plus all hardware in one complete kit is convenient and good value.",
    guestName: 'Michael Anderson',
  },
  {
    rating: 5,
    comment:
      "Upgrading the steering system on my GMC with Dana 60 and this complete kit is exactly what I needed. This is a comprehensive top-of-the-line steering kit designed specifically for Dana 44/Dana 60 1-ton axles. The kit includes 1 ES 2234 R standard right tie rod, 1 ES 2234 L standard left tie rod, 1 ES 23434 R offset right tie rod end, 1 ES 23434 L offset left tie rod end, 2 7/8-18 LH tube adapters, 2 7/8-18 RH tube adapters, 2 7/8-18 LH jam nuts, and 2 7/8-18 RH jam nuts. What makes this kit exceptional is having BOTH standard ES 2234 and offset ES 23434 tie rod ends included in one complete package, which gives tremendous flexibility for different steering configurations and setups. The kit comes with all required adapters and jam nuts for straightforward assembly. Metal-on-metal construction with spring technology provides increased durability for both on-road and off-road capability. After installation, alignment, and about 240 miles of testing including heavy off-road trails, full articulation, and mixed driving conditions, steering accuracy and agility are outstanding. All components are working perfectly with no play, no binding, excellent precision. Having both standard and offset tie rod ends plus all the necessary hardware (tube adapters, jam nuts) in one complete kit made the installation straightforward and saved ordering multiple items separately. This is a complete solution for replacing your steering system on Dana 44/Dana 60 1-ton axles with the capability of handling on-road and off-road driving. Outstanding value for a top-of-the-line complete kit.",
    guestName: 'Sarah Thompson',
  },
];

// ========================================
// Helper Functions
// ========================================

// Generate random date within a range
// Generate a random date within the current month and the previous 5 months (i.e., from the 1st of 6 months ago through now)
// New getRandomDate generates a realistic "X days ago" (1-179 days, i.e. up to 6 months), evenly distributed.
const getRandomDate = () => {
  const now = new Date();
  // Up to 179 days ago (almost 6 months, covers '1 week ago', '7 days ago', etc)
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
    console.log('✅ Connected to database');

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

