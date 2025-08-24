import express from 'express';
import {
  getDashboardAmount,
  getDashboardRecentOrder,
  getOrderById,
  getOrderByUser,
  getSalesReport,
  mostSellingCategory,
} from '../controller/user.order.controller.js';
const router = express.Router();

// get dashboard amount
router.get('/dashboard-amount', getDashboardAmount);

// get sales-report
router.get('/sales-report', getSalesReport);

// get sales-report
router.get('/most-selling-category', mostSellingCategory);

// get sales-report
router.get('/dashboard-recent-order', getDashboardRecentOrder);

//get a order by id
router.get('/:id', getOrderById);

//get all order by a user
router.get('/', getOrderByUser);

export default router;
