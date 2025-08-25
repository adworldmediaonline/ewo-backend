import mongoose from 'mongoose';
import Order from '../model/Order.js';
import Products from '../model/Products.js';
import Review from '../model/Review.js';
import User from '../model/User.js';
import jwt from 'jsonwebtoken';
import { secret } from '../config/secret.js';

// add a review
export const addReview = async (req, res, next) => {
  const { userId, productId, rating, comment } = req.body;
  try {
    // Check if the user has already left a review for this product
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
    });

    if (existingReview) {
      return res
        .status(400)
        .json({ message: 'You have already left a review for this product.' });
    }
    const checkPurchase = await Order.findOne({
      user: new mongoose.Types.ObjectId(userId),
      'cart._id': { $in: [productId] },
    });
    if (!checkPurchase) {
      return res
        .status(400)
        .json({ message: 'Without purchase you can not give here review!' });
    }

    // Create the new review
    const review = await Review.create(req.body);
    // console.log('review-->',review)

    // Add the review to the product's reviews array
    const product = await Products.findById(productId);
    product.reviews.push(review._id);
    await product.save();

    // Add the review to the user's reviews array
    const user = await User.findById(userId);
    user.reviews.push(review._id);
    await user.save();

    return res.status(201).json({ message: 'Review added successfully.' });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// Quick feedback from email (single click rating)
export const quickFeedback = async (req, res, next) => {
  const { token, rating } = req.query;

  try {
    // Verify the review token
    let tokenData;
    try {
      tokenData = jwt.verify(token, secret.jwt_secret_for_verify);
    } catch (error) {
      return res.status(400).send(`
        <html>
          <head><title>Invalid Token</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Invalid or Expired Link</h2>
            <p>This review link is no longer valid. Please contact support if you need assistance.</p>
          </body>
        </html>
      `);
    }

    // Find the order
    const order = await Order.findById(tokenData.orderId);
    if (!order) {
      return res.status(404).send(`
        <html>
          <head><title>Order Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Order Not Found</h2>
            <p>The order associated with this review link could not be found.</p>
          </body>
        </html>
      `);
    }

    // Check if feedback has already been submitted
    if (order.feedbackSubmittedAt) {
      return res.status(200).send(`
        <html>
          <head><title>Already Submitted</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Thank You!</h2>
            <p>Your feedback has already been submitted for this order.</p>
            <p>We appreciate your review!</p>
          </body>
        </html>
      `);
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).send(`
        <html>
          <head><title>Invalid Rating</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Invalid Rating</h2>
            <p>Please select a valid rating between 1 and 5 stars.</p>
          </body>
        </html>
      `);
    }

    // Create reviews for all products in the order
    const reviewPromises = order.cart.map(async item => {
      const product = await Products.findById(item._id);
      if (!product) {
        console.log(`Product not found: ${item._id}`);
        return null;
      }

      const review = await Review.create({
        productId: item._id,
        rating: parseInt(rating),
        comment: '',
        guestEmail: tokenData.email,
        guestName: order.name,
        orderId: tokenData.orderId,
        isFromFeedbackEmail: true,
        userId: null,
      });

      product.reviews.push(review._id);
      await product.save();

      return review;
    });

    const createdReviews = await Promise.all(reviewPromises);
    const validReviews = createdReviews.filter(review => review !== null);

    // Update order to mark feedback as submitted
    order.feedbackSubmittedAt = new Date();
    await order.save();

    const ratingText = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][
      rating
    ];
    const stars = '⭐'.repeat(rating);

    res.status(200).send(`
      <html>
        <head>
          <title>Thank You for Your Feedback!</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #28a745; margin-bottom: 20px;">✅ Thank You for Your Feedback!</h2>
            <div style="font-size: 24px; margin: 20px 0;">${stars}</div>
            <p style="font-size: 18px; color: #333; margin-bottom: 10px;">You rated your experience: <strong>${ratingText}</strong></p>
            <p style="color: #666; margin-bottom: 30px;">Your ${validReviews.length} review(s) have been submitted successfully.</p>
            <p style="color: #666; font-size: 14px;">We appreciate your feedback and will use it to improve our service!</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error submitting quick feedback:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Something went wrong</h2>
          <p>Please try again later or contact support.</p>
        </body>
      </html>
    `);
  }
};

// Detailed feedback form
export const detailedFeedback = async (req, res, next) => {
  const { token } = req.query;

  try {
    // Verify the review token
    let tokenData;
    try {
      tokenData = jwt.verify(token, secret.jwt_secret_for_verify);
    } catch (error) {
      return res.status(400).send(`
        <html>
          <head><title>Invalid Token</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Invalid or Expired Link</h2>
            <p>This review link is no longer valid.</p>
          </body>
        </html>
      `);
    }

    // Find the order
    const order = await Order.findById(tokenData.orderId);
    if (!order) {
      return res.status(404).send(`
        <html>
          <head><title>Order Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Order Not Found</h2>
            <p>The order associated with this review link could not be found.</p>
          </body>
        </html>
      `);
    }

    // Check if feedback has already been submitted
    if (order.feedbackSubmittedAt) {
      return res.status(200).send(`
        <html>
          <head><title>Already Submitted</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Thank You!</h2>
            <p>Your feedback has already been submitted for this order.</p>
          </body>
        </html>
      `);
    }

    // Return detailed feedback form
    res.status(200).send(`
      <html>
        <head>
          <title>Detailed Review</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .star-rating { display: flex; justify-content: center; gap: 5px; margin: 20px 0; }
            .star { font-size: 30px; color: #ddd; cursor: pointer; }
            .star.active { color: #ffc107; }
            .form-group { margin: 20px 0; }
            label { display: block; margin-bottom: 8px; font-weight: bold; }
            textarea { width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; min-height: 120px; resize: vertical; }
            .submit-btn { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; }
            .submit-btn:hover { background: #218838; }
            .message { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="text-align: center; color: #333; margin-bottom: 30px;">⭐ Share Your Detailed Experience</h2>

            <form id="reviewForm" onsubmit="submitDetailedReview(event)">
              <div class="form-group">
                <label>How would you rate your overall experience?</label>
                <div class="star-rating" id="starRating">
                  <span class="star" data-rating="1">★</span>
                  <span class="star" data-rating="2">★</span>
                  <span class="star" data-rating="3">★</span>
                  <span class="star" data-rating="4">★</span>
                  <span class="star" data-rating="5">★</span>
                </div>
                <input type="hidden" id="rating" required>
              </div>

              <div class="form-group">
                <label for="comment">Tell us more about your experience:</label>
                <textarea id="comment" placeholder="What did you like? How can we improve?"></textarea>
              </div>

              <button type="submit" class="submit-btn" id="submitBtn">Submit Detailed Review</button>
            </form>

            <div id="successMessage" class="message success" style="display: none;">
              ✅ Thank you for your detailed feedback! Your review has been submitted successfully.
            </div>

            <div id="errorMessage" class="message error" style="display: none;">
              ❌ There was an error submitting your review. Please try again.
            </div>
          </div>

          <script>
            const stars = document.querySelectorAll('.star');
            const ratingInput = document.getElementById('rating');

            stars.forEach((star, index) => {
              star.addEventListener('click', () => {
                const rating = index + 1;
                ratingInput.value = rating;

                stars.forEach((s, i) => {
                  s.classList.toggle('active', i < rating);
                });
              });
            });

            async function submitDetailedReview(event) {
              event.preventDefault();

              const rating = document.getElementById('rating').value;
              const comment = document.getElementById('comment').value;

              if (!rating) {
                alert('Please select a rating');
                return;
              }

              const submitBtn = document.getElementById('submitBtn');
              submitBtn.textContent = 'Submitting...';
              submitBtn.disabled = true;

                             try {
                 const response = await fetch('${secret.api_base_url}/api/review/submit-detailed-feedback', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     token: '${token}',
                     rating: rating,
                     comment: comment
                   })
                 });

                const result = await response.json();

                if (result.success) {
                  document.getElementById('reviewForm').style.display = 'none';
                  document.getElementById('successMessage').style.display = 'block';
                } else {
                  throw new Error(result.message || 'Failed to submit review');
                }
              } catch (error) {
                document.getElementById('errorMessage').style.display = 'block';
                document.getElementById('errorMessage').innerHTML = '❌ ' + error.message;
                submitBtn.textContent = 'Submit Detailed Review';
                submitBtn.disabled = false;
              }
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error loading detailed feedback form:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Something went wrong</h2>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
  }
};

// Get unified feedback form (combines rating and review)
export const getUnifiedFeedback = async (req, res, next) => {
  const { token } = req.query;

  try {
    // Verify the review token
    let tokenData;
    try {
      tokenData = jwt.verify(token, secret.jwt_secret_for_verify);
    } catch (error) {
      return res.status(400).send(`
        <html>
          <head><title>Invalid Token</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Invalid or expired review link</h2>
            <p>This review link has expired or is invalid.</p>
          </body>
        </html>
      `);
    }

    // Find the order
    const order = await Order.findById(tokenData.orderId);
    if (!order) {
      return res.status(404).send(`
        <html>
          <head><title>Order Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Order not found</h2>
            <p>We couldn't find your order. Please contact support.</p>
          </body>
        </html>
      `);
    }

    // Check if feedback has already been submitted
    if (order.feedbackSubmittedAt) {
      return res.status(400).send(`
        <html>
          <head><title>Already Submitted</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Review already submitted</h2>
            <p>Thank you! You have already submitted a review for this order.</p>
          </body>
        </html>
      `);
    }

    // Return the unified feedback form
    res.send(`
      <html>
        <head>
          <title>Rate & Review Your Order</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              margin-top: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #333;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .header p {
              color: #666;
              margin: 0;
              font-size: 16px;
            }
            .rating-section {
              margin-bottom: 30px;
            }
            .rating-title {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 15px;
              text-align: center;
            }
            .star-buttons {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
              gap: 10px;
              margin-bottom: 20px;
            }
            .star-button {
              background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
              color: #333;
              padding: 15px 10px;
              border: none;
              border-radius: 10px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              transition: all 0.3s ease;
              text-decoration: none;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 5px;
              box-shadow: 0 4px 8px rgba(255,215,0,0.3);
            }
            .star-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 12px rgba(255,215,0,0.4);
            }
            .star-button.selected {
              background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
              color: white;
              box-shadow: 0 6px 12px rgba(0,123,255,0.4);
            }
            .comment-section {
              margin-bottom: 30px;
            }
            .comment-title {
              font-size: 16px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .comment-subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 15px;
            }
            textarea {
              width: 100%;
              padding: 15px;
              border: 2px solid #ddd;
              border-radius: 10px;
              font-size: 16px;
              box-sizing: border-box;
              resize: vertical;
              min-height: 120px;
              font-family: inherit;
            }
            textarea:focus {
              outline: none;
              border-color: #007bff;
              box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
            }
            .submit-section {
              text-align: center;
            }
            .submit-btn {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              padding: 15px 40px;
              border: none;
              border-radius: 10px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 8px rgba(40,167,69,0.3);
            }
            .submit-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 12px rgba(40,167,69,0.4);
            }
            .submit-btn:disabled {
              background: #ccc;
              cursor: not-allowed;
              transform: none;
              box-shadow: none;
            }
            .success-message, .error-message {
              padding: 20px;
              border-radius: 10px;
              margin-top: 20px;
              text-align: center;
              display: none;
            }
            .success-message {
              background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            .error-message {
              background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
            .required {
              color: #dc3545;
            }
            @media (max-width: 600px) {
              .container {
                padding: 20px;
                margin-top: 10px;
              }
              .star-buttons {
                grid-template-columns: 1fr;
              }
              .header h1 {
                font-size: 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⭐ Rate & Review</h1>
              <p>Your feedback helps other customers make better decisions</p>
            </div>

            <form id="reviewForm" onsubmit="submitUnifiedReview(event)">
              <div class="rating-section">
                <div class="rating-title">How would you rate your experience? <span class="required">*</span></div>
                <div class="star-buttons">
                  <button type="button" class="star-button" data-rating="1">
                    <span style="font-size: 20px;">⭐</span>
                    <span>Poor</span>
                  </button>
                  <button type="button" class="star-button" data-rating="2">
                    <span style="font-size: 20px;">⭐⭐</span>
                    <span>Fair</span>
                  </button>
                  <button type="button" class="star-button" data-rating="3">
                    <span style="font-size: 20px;">⭐⭐⭐</span>
                    <span>Good</span>
                  </button>
                  <button type="button" class="star-button" data-rating="4">
                    <span style="font-size: 20px;">⭐⭐⭐⭐</span>
                    <span>Very Good</span>
                  </button>
                  <button type="button" class="star-button" data-rating="5">
                    <span style="font-size: 20px;">⭐⭐⭐⭐⭐</span>
                    <span>Excellent</span>
                  </button>
                </div>
              </div>

              <div class="comment-section">
                <div class="comment-title">Share your thoughts</div>
                <div class="comment-subtitle">Tell us more about your experience (optional)</div>
                <textarea
                  id="comment"
                  name="comment"
                  placeholder="What did you like or dislike? How was the product quality, delivery, or customer service? Your detailed feedback helps other customers..."
                ></textarea>
              </div>

              <div class="submit-section">
                <button type="submit" class="submit-btn" id="submitBtn">
                  Submit Review
                </button>
              </div>
            </form>

            <div class="success-message" id="successMessage">
              <h2>✅ Thank you for your review!</h2>
              <p>Your feedback has been submitted successfully and will help other customers make informed decisions.</p>
            </div>

            <div class="error-message" id="errorMessage">
              ❌ Something went wrong. Please try again.
            </div>
          </div>

          <script>
            let selectedRating = null;

            // Add click handlers for star rating buttons
            document.querySelectorAll('.star-button').forEach(button => {
              button.addEventListener('click', function() {
                selectedRating = this.dataset.rating;

                // Update visual feedback
                document.querySelectorAll('.star-button').forEach(btn => {
                  btn.classList.remove('selected');
                });

                this.classList.add('selected');
              });
            });

            async function submitUnifiedReview(event) {
              event.preventDefault();

              if (!selectedRating) {
                alert('Please select a rating before submitting');
                return;
              }

              const comment = document.getElementById('comment').value;
              const submitBtn = document.getElementById('submitBtn');

              submitBtn.textContent = 'Submitting...';
              submitBtn.disabled = true;

              try {
                const response = await fetch('${secret.api_base_url}/api/review/submit-unified-feedback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: '${token}',
                    rating: selectedRating,
                    comment: comment
                  })
                });

                const result = await response.json();

                if (result.success) {
                  document.getElementById('reviewForm').style.display = 'none';
                  document.getElementById('successMessage').style.display = 'block';
                } else {
                  throw new Error(result.message || 'Failed to submit review');
                }
              } catch (error) {
                document.getElementById('errorMessage').style.display = 'block';
                document.getElementById('errorMessage').innerHTML = '❌ ' + error.message;
                submitBtn.textContent = 'Submit Review';
                submitBtn.disabled = false;
              }
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error loading unified feedback form:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Something went wrong</h2>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
  }
};

// Submit unified feedback
export const submitUnifiedFeedback = async (req, res, next) => {
  const { token, rating, comment } = req.body;

  try {
    // Enhanced logging for security monitoring
    console.log('🔒 Feedback submission attempt:', {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      hasToken: !!token,
      hasRating: !!rating,
      commentLength: comment?.length || 0,
    });

    // Verify the review token
    let tokenData;
    try {
      tokenData = jwt.verify(token, secret.jwt_secret_for_verify);
    } catch (error) {
      console.warn('⚠️ Invalid token attempt:', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        error: error.message,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired review token',
      });
    }

    // Validate token purpose
    if (tokenData.purpose !== 'feedback_review') {
      console.warn('⚠️ Invalid token purpose:', {
        ip: req.ip,
        purpose: tokenData.purpose,
        expected: 'feedback_review',
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid token purpose',
      });
    }

    // Find the order
    const order = await Order.findById(tokenData.orderId);
    if (!order) {
      console.warn('⚠️ Order not found for token:', {
        ip: req.ip,
        orderId: tokenData.orderId,
      });
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Enhanced email verification - ensure token email matches order email
    if (tokenData.email !== order.email) {
      console.warn('⚠️ Email mismatch detected:', {
        ip: req.ip,
        tokenEmail: tokenData.email,
        orderEmail: order.email,
        orderId: order._id,
      });
      return res.status(403).json({
        success: false,
        message: 'Token email does not match order email',
      });
    }

    // Check if feedback has already been submitted
    if (order.feedbackSubmittedAt) {
      console.warn('⚠️ Duplicate feedback attempt:', {
        ip: req.ip,
        orderId: order._id,
        previousSubmission: order.feedbackSubmittedAt,
      });
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been submitted for this order',
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Sanitize comment input to prevent XSS
    const sanitizedComment = comment ? comment.trim().substring(0, 1000) : '';

    // Remove potentially dangerous characters/scripts
    const cleanComment = sanitizedComment
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Create review for all products in the order
    const reviewPromises = order.cart.map(async item => {
      const product = await Products.findById(item._id);
      if (!product) {
        console.log(`Product not found: ${item._id}`);
        return null;
      }

      const review = await Review.create({
        productId: item._id,
        rating: parseInt(rating),
        comment: cleanComment,
        guestEmail: tokenData.email,
        guestName: order.name,
        orderId: order._id,
        isFromFeedbackEmail: true,
        userId: order.userId || null,
        // Add metadata for security tracking
        submissionIP: req.ip || req.connection?.remoteAddress,
        submissionUserAgent: req.headers['user-agent'],
        submissionTimestamp: new Date(),
      });

      product.reviews.push(review._id);
      await product.save();

      return review;
    });

    // Save all reviews
    const createdReviews = await Promise.all(reviewPromises);
    const validReviews = createdReviews.filter(review => review !== null);

    // Update order with feedback submission timestamp and security metadata
    await Order.findByIdAndUpdate(order._id, {
      feedbackSubmittedAt: new Date(),
      feedbackSubmissionIP: req.ip || req.connection?.remoteAddress,
      feedbackSubmissionUserAgent: req.headers['user-agent'],
    });

    // Log successful submission
    console.log('✅ Feedback submitted successfully:', {
      orderId: order._id,
      reviewsCreated: validReviews.length,
      customerEmail: tokenData.email,
      rating: rating,
      hasComment: !!cleanComment,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    console.error('❌ Error submitting unified feedback:', {
      error: error.message,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
    });
  }
};

// Submit detailed feedback
export const submitDetailedFeedback = async (req, res, next) => {
  const { token, rating, comment } = req.body;

  try {
    // Verify the review token
    let tokenData;
    try {
      tokenData = jwt.verify(token, secret.jwt_secret_for_verify);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired review token',
      });
    }

    // Find the order
    const order = await Order.findById(tokenData.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if feedback has already been submitted
    if (order.feedbackSubmittedAt) {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been submitted for this order',
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Create reviews for all products in the order
    const reviewPromises = order.cart.map(async item => {
      const product = await Products.findById(item._id);
      if (!product) {
        console.log(`Product not found: ${item._id}`);
        return null;
      }

      const review = await Review.create({
        productId: item._id,
        rating: parseInt(rating),
        comment: comment || '',
        guestEmail: tokenData.email,
        guestName: order.name,
        orderId: tokenData.orderId,
        isFromFeedbackEmail: true,
        userId: null,
      });

      product.reviews.push(review._id);
      await product.save();

      return review;
    });

    const createdReviews = await Promise.all(reviewPromises);
    const validReviews = createdReviews.filter(review => review !== null);

    // Update order to mark feedback as submitted
    order.feedbackSubmittedAt = new Date();
    await order.save();

    res.status(201).json({
      success: true,
      message: `Thank you for your detailed feedback! ${validReviews.length} review(s) have been submitted successfully.`,
      reviewsCreated: validReviews.length,
    });
  } catch (error) {
    console.error('Error submitting detailed feedback:', error);
    next(error);
  }
};

// delete a review
export const deleteReviews = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const result = await Review.deleteMany({ productId: productId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Product reviews not found' });
    }
    res.json({ message: 'All reviews deleted for the product' });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
