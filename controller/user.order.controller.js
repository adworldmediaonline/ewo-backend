import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import isToday from 'dayjs/plugin/isToday.js';
import isYesterday from 'dayjs/plugin/isYesterday.js';
import mongoose from 'mongoose';
import Order from '../model/Order.js';

// Apply necessary plugins to dayjs
dayjs.extend(customParseFormat);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// get all orders user
export const getOrderByUser = async (req, res, next) => {
  try {
    const { page, limit, userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const totalDoc = await Order.countDocuments({ user: userId });

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: 'pending',
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: 'processing',
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total shipped order count
    const totalShippedOrder = await Order.aggregate([
      {
        $match: {
          status: 'shipped',
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total cancelled order count
    const totalCancelledOrder = await Order.aggregate([
      {
        $match: {
          status: 'cancel',
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // today order amount

    // query for orders
    const orders = await Order.find({ user: userId }).sort({ _id: -1 });

    res.send({
      orders,
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      processing:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      delivered:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,
      shipped: totalShippedOrder.length === 0 ? 0 : totalShippedOrder[0].count,
      cancelled:
        totalCancelledOrder.length === 0 ? 0 : totalCancelledOrder[0].count,
      totalDoc,
    });
  } catch (error) {
    next(error);
  }
};

// getOrderById
export const getOrderById = async (req, res, next) => {
  try {
    console.log(req.params.id);
    const order = await Order.findById(req.params.id);
    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// getDashboardAmount
export const getDashboardAmount = async (req, res, next) => {
  try {
    const todayStart = dayjs().startOf('day');
    const todayEnd = dayjs().endOf('day');

    const yesterdayStart = dayjs().subtract(1, 'day').startOf('day');
    const yesterdayEnd = dayjs().subtract(1, 'day').endOf('day');

    const monthStart = dayjs().startOf('month');
    const monthEnd = dayjs().endOf('month');

    const todayOrders = await Order.find({
      createdAt: { $gte: todayStart.toDate(), $lte: todayEnd.toDate() },
    });

    let todayCashPaymentAmount = 0;
    let todayCardPaymentAmount = 0;

    todayOrders.forEach(order => {
      if (order.paymentMethod === 'COD') {
        todayCashPaymentAmount += order.totalAmount;
      } else if (order.paymentMethod === 'Card') {
        todayCardPaymentAmount += order.totalAmount;
      }
    });

    const yesterdayOrders = await Order.find({
      createdAt: { $gte: yesterdayStart.toDate(), $lte: yesterdayEnd.toDate() },
    });

    let yesterDayCashPaymentAmount = 0;
    let yesterDayCardPaymentAmount = 0;

    yesterdayOrders.forEach(order => {
      if (order.paymentMethod === 'COD') {
        yesterDayCashPaymentAmount += order.totalAmount;
      } else if (order.paymentMethod === 'Card') {
        yesterDayCardPaymentAmount += order.totalAmount;
      }
    });

    const monthlyOrders = await Order.find({
      createdAt: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() },
    });

    const totalOrders = await Order.find();
    const todayOrderAmount = todayOrders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );
    const yesterdayOrderAmount = yesterdayOrders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );

    const monthlyOrderAmount = monthlyOrders.reduce((total, order) => {
      return total + order.totalAmount;
    }, 0);
    const totalOrderAmount = totalOrders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );

    res.status(200).send({
      todayOrderAmount,
      yesterdayOrderAmount,
      monthlyOrderAmount,
      totalOrderAmount,
      todayCardPaymentAmount,
      todayCashPaymentAmount,
      yesterDayCardPaymentAmount,
      yesterDayCashPaymentAmount,
    });
  } catch (error) {
    next(error);
  }
};
// get sales report
export const getSalesReport = async (req, res, next) => {
  try {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const salesOrderChartData = await Order.find({
      updatedAt: {
        $gte: startOfWeek,
        $lte: new Date(),
      },
    });

    const salesReport = salesOrderChartData.reduce((res, value) => {
      const onlyDate = value.updatedAt.toISOString().split('T')[0];

      if (!res[onlyDate]) {
        res[onlyDate] = { date: onlyDate, total: 0, order: 0 };
      }
      res[onlyDate].total += value.totalAmount;
      res[onlyDate].order += 1;
      return res;
    }, {});

    const salesReportData = Object.values(salesReport);

    // Send the response to the client site
    res.status(200).json({ salesReport: salesReportData });
  } catch (error) {
    // Handle error if any
    next(error);
  }
};

// Most Selling Category
export const mostSellingCategory = async (req, res, next) => {
  try {
    const categoryData = await Order.aggregate([
      {
        $unwind: '$cart', // Deconstruct the cart array
      },
      {
        $group: {
          _id: '$cart.productType',
          count: { $sum: '$cart.orderQuantity' },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    res.status(200).json({ categoryData });
  } catch (error) {
    next(error);
  }
};

// dashboard recent order
export const getDashboardRecentOrder = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const queryObject = {
      status: { $in: ['pending', 'processing', 'delivered', 'cancel'] },
    };

    const totalDoc = await Order.countDocuments(queryObject);

    const orders = await Order.aggregate([
      { $match: queryObject },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          invoice: 1,
          createdAt: 1,
          updatedAt: 1,
          paymentMethod: 1,
          name: 1,
          user: 1,
          totalAmount: 1,
          status: 1,
        },
      },
    ]);

    res.status(200).send({
      orders: orders,
      page: page,
      limit: limit,
      totalOrder: totalDoc,
    });
  } catch (error) {
    next(error);
  }
};

// get order breakdown statistics
export const getOrderBreakdown = async (req, res, next) => {
  try {
    // Get counts and amounts for each status
    const statusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    // Create a map for easy access
    const breakdownMap = {
      delivered: { count: 0, totalAmount: 0 },
      pending: { count: 0, totalAmount: 0 },
      processing: { count: 0, totalAmount: 0 },
      shipped: { count: 0, totalAmount: 0 },
      cancel: { count: 0, totalAmount: 0 },
    };

    // Fill in the actual data
    statusBreakdown.forEach(item => {
      if (breakdownMap[item._id] !== undefined) {
        breakdownMap[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount,
        };
      }
    });

    // Get total orders
    const totalOrders = Object.values(breakdownMap).reduce(
      (sum, item) => sum + item.count,
      0
    );
    const totalRevenue = Object.values(breakdownMap).reduce(
      (sum, item) => sum + item.totalAmount,
      0
    );

    // Calculate percentages
    const breakdown = {
      delivered: {
        count: breakdownMap.delivered.count,
        totalAmount: breakdownMap.delivered.totalAmount,
        percentage:
          totalOrders > 0
            ? ((breakdownMap.delivered.count / totalOrders) * 100).toFixed(1)
            : 0,
      },
      pending: {
        count: breakdownMap.pending.count,
        totalAmount: breakdownMap.pending.totalAmount,
        percentage:
          totalOrders > 0
            ? ((breakdownMap.pending.count / totalOrders) * 100).toFixed(1)
            : 0,
      },
      processing: {
        count: breakdownMap.processing.count,
        totalAmount: breakdownMap.processing.totalAmount,
        percentage:
          totalOrders > 0
            ? ((breakdownMap.processing.count / totalOrders) * 100).toFixed(1)
            : 0,
      },
      shipped: {
        count: breakdownMap.shipped.count,
        totalAmount: breakdownMap.shipped.totalAmount,
        percentage:
          totalOrders > 0
            ? ((breakdownMap.shipped.count / totalOrders) * 100).toFixed(1)
            : 0,
      },
      cancelled: {
        count: breakdownMap.cancel.count,
        totalAmount: breakdownMap.cancel.totalAmount,
        percentage:
          totalOrders > 0
            ? ((breakdownMap.cancel.count / totalOrders) * 100).toFixed(1)
            : 0,
      },
      total: {
        orders: totalOrders,
        revenue: totalRevenue,
      },
    };

    res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
};
