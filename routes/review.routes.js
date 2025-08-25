import express from 'express';
import {
  addReview,
  deleteReviews,
  quickFeedback,
  detailedFeedback,
  submitDetailedFeedback,
  getUnifiedFeedback,
  submitUnifiedFeedback,
} from '../controller/review.controller.js';
import {
  reviewSubmissionLimiter,
  feedbackFormLimiter,
} from '../middleware/rateLimiter.js';
const router = express.Router();

// add a review
router.post('/add', addReview);
// quick feedback from email (single click rating)
router.get('/quick-feedback', reviewSubmissionLimiter, quickFeedback);
// detailed feedback form
router.get('/detailed-feedback', feedbackFormLimiter, detailedFeedback);
// submit detailed feedback
router.post(
  '/submit-detailed-feedback',
  reviewSubmissionLimiter,
  submitDetailedFeedback
);
// unified feedback form (combines rating and review)
router.get('/unified-feedback', feedbackFormLimiter, getUnifiedFeedback);
// submit unified feedback
router.post(
  '/submit-unified-feedback',
  reviewSubmissionLimiter,
  submitUnifiedFeedback
);
// delete reviews
router.delete('/delete/:id', deleteReviews);

export default router;
