import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Reviews from '../model/Review.js';
import Products from '../model/Products.js';

dotenv.config();

// Helper function to generate random date within a range
const getRandomDate = (start, end) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

// Helper function to add random minutes to a date
const addRandomMinutes = (date, minMinutes = 0, maxMinutes = 30) => {
  const minutes =
    Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return new Date(date.getTime() + minutes * 60000);
};

// USA-based names for guest reviews
const usaNames = [
  'Michael Johnson',
  'Sarah Williams',
  'David Brown',
  'Emily Davis',
  'James Miller',
  'Jessica Garcia',
  'Robert Martinez',
  'Amanda Rodriguez',
  'Christopher Lee',
  'Jennifer Anderson',
];

const seedReviewsForE90157 = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    // Find the product by SKU
    const product = await Products.findOne({ sku: 'E90157' }).select(
      '_id title sku reviews'
    );

    if (!product) {
      console.error('❌ Product with SKU E90157 not found!');
      process.exit(1);
    }

    console.log(`✅ Found product: ${product.title} (SKU: ${product.sku})`);

    // Reviews data with ratings and comments
    const reviewsData = [
      {
        rating: 4.5,
        comment: 'Solid quality. Parts fit perfectly on my Dana 44.',
        guestName: usaNames[0],
      },
      {
        rating: 5,
        comment:
          'The knuckles and high-steer arms are machined very precisely. I noticed an immediate improvement in steering stability. Definitely worth the price.',
        guestName: usaNames[1],
      },
      {
        rating: 5,
        comment:
          "I've tried multiple brands before, but EWO's material quality stands out. The DOM tubes and tie rod ends feel heavy-duty and reliable.",
        guestName: usaNames[2],
      },
      {
        rating: 5,
        comment:
          "I purchased this kit for my old Chevy truck, and I'm impressed by how well everything fit right out of the box. The knuckles are sturdy, the arms are thick, and the taper machining is spot-on. After installing the full setup, the steering response improved noticeably. The kit feels reliable and well-built.",
        guestName: usaNames[3],
      },
      {
        rating: 4.5,
        comment:
          'Took my time comparing different high-steer kits online and finally went with East West Off Road because of the domestic billet material and warranty. The tubes were straight, weld bungs were clean, and all tie rod ends came with grease fittings and hardware. After a few weeks of trail use, everything is holding strong without any play or noise.',
        guestName: usaNames[4],
      },
      {
        rating: 4.5,
        comment: 'High-steer arms feel extremely durable. Great upgrade.',
        guestName: usaNames[5],
      },
      {
        rating: 5,
        comment:
          'Great option for anyone upgrading a Chevy Dana 44. Everything came neatly packed with all bolts and fittings included. Good overall experience.',
        guestName: usaNames[6],
      },
      {
        rating: 5,
        comment: 'Good customer service and well-machined components.',
        guestName: usaNames[7],
      },
      {
        rating: 5,
        comment:
          'I was worried about compatibility, but everything matched perfectly with my GM setup. The pitman arm and drag link ends were high quality.',
        guestName: usaNames[8],
      },
      {
        rating: 5,
        comment:
          'Very durable kit. The finish and machining look professional, and installation instructions were straightforward for someone with basic mechanical knowledge.',
        guestName: usaNames[9],
      },
    ];

    const createdReviews = [];
    const reviewIds = [];

    // Create reviews
    for (const reviewData of reviewsData) {
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
        guestEmail: `${reviewData.guestName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        isFromFeedbackEmail: false,
        submissionTimestamp: submissionTimestamp,
        createdAt: createdAt,
        updatedAt: updatedAt,
      });

      const savedReview = await review.save();
      createdReviews.push(savedReview);
      reviewIds.push(savedReview._id);
      console.log(`✅ Created review by ${reviewData.guestName} (Rating: ${reviewData.rating})`);
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

    console.log(`\n✅ Successfully seeded ${createdReviews.length} reviews for product SKU E90157`);
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
seedReviewsForE90157();

