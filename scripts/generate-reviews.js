require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Reviews = require('../model/Review');
const Products = require('../model/Products');

// Helper function to generate random date within a range
function getRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper function to add random minutes to a date
function addRandomMinutes(date, minMinutes = 0, maxMinutes = 30) {
  const minutes =
    Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return new Date(date.getTime() + minutes * 60000);
}

async function generateReviews() {
  try {
    await connectDB();
    console.log('Starting review generation for product E90178...');

    // Find the product by SKU
    const product = await Products.findOne({ sku: 'E90178' }).select(
      '_id title price status reviews'
    );
    console.log(product);
    if (!product) {
      console.error('Product with SKU E90178 not found!');
      process.exit(1);
    }

    console.log(`Found product: ${product.title} (ID: ${product._id})`);

    // Reviews data from the image with realistic timestamps
    const reviewsData = [
      {
        rating: 5,
        comment:
          'As described, good quality. Shipped on time. My first time doing knuckles, you should press the studs for the spindles in, before the ball joints.',
        guestName: 'jjeil350',
        guestEmail: 'jjeil350@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2024-12-01'),
          new Date('2024-12-31')
        ),
      },
      {
        rating: 5,
        comment: 'Items exactly as described and good price.',
        guestName: 'lelanhill-0',
        guestEmail: 'lelanhill-0@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2024-12-15'),
          new Date('2025-01-15')
        ),
      },
      {
        rating: 5,
        comment:
          "Worked great. Had to shave some of the castings off so the calipers would fit without interfering. Sure wish they had a 1'' riser and extended 9/16 studs to go with the arms. 9/16 studs are hard to find! The 1'' offset riser they do sell are way too expensive.",
        guestName: '61591',
        guestEmail: '61591@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2025-05-01'),
          new Date('2025-05-31')
        ),
      },
      {
        rating: 5,
        comment: 'Quick shipping',
        guestName: 'kat00695',
        guestEmail: 'kat00695@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2024-06-01'),
          new Date('2024-07-31')
        ),
      },
      {
        rating: 5,
        comment:
          'They fit really well on a 1979 k10. One knuckle arrived fast the other was slow to get here and was rusty, not what I was expecting but I cleaned it up and installed it.',
        guestName: 'nichvent_89',
        guestEmail: 'nichvent_89@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2024-05-01'),
          new Date('2024-06-30')
        ),
      },
      {
        rating: 5,
        comment:
          'Parts arrived early, but missing pieces. When messaging seller, they had the missing pieces in the mail within minutes and they arrived by the original due date. This seller deserves the 100% positive feedback. Would not hesitate to do business again!',
        guestName: 'chadsok',
        guestEmail: 'chadsok@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2025-04-01'),
          new Date('2025-05-31')
        ),
      },
      {
        rating: 5,
        comment: 'Great ebayer',
        guestName: 'spenc484',
        guestEmail: 'spenc484@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2024-03-01'),
          new Date('2024-04-30')
        ),
      },
      {
        rating: 5,
        comment: 'Great product, fast shipping',
        guestName: 'mavirgina2995',
        guestEmail: 'mavirgina2995@gmail.com',
        isFromFeedbackEmail: false,
        createdAt: getRandomDate(
          new Date('2024-02-01'),
          new Date('2024-03-31')
        ),
      },
    ];

    const createdReviews = [];
    const reviewIds = [];

    // Create reviews
    for (const reviewData of reviewsData) {
      // Generate realistic timestamps
      const createdAt = reviewData.createdAt;
      const updatedAt = addRandomMinutes(createdAt, 5, 120); // Update 5-120 minutes after creation
      const submissionTimestamp = addRandomMinutes(createdAt, 1, 10); // Submit 1-10 minutes after creation

      const review = new Reviews({
        productId: product._id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        guestEmail: reviewData.guestEmail,
        guestName: reviewData.guestName,
        isFromFeedbackEmail: reviewData.isFromFeedbackEmail,
        submissionTimestamp: submissionTimestamp,
        createdAt: createdAt,
        updatedAt: updatedAt,
      });

      const savedReview = await review.save();
      createdReviews.push(savedReview);
      reviewIds.push(savedReview._id);

      console.log(
        `Created review for ${
          reviewData.guestName
        } (${createdAt.toLocaleDateString()}): ${reviewData.comment.substring(
          0,
          50
        )}...`
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

    console.log('Reviews generated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Review generation failed:', error);
    process.exit(1);
  }
}

// Run the script
generateReviews();
