const mongoose = require('mongoose');
const { secret } = require('./secret');

mongoose.set('strictQuery', false);

// local url
// const DB_URL = 'mongodb://0.0.0.0:27017/ewo';
// mongodb url
const MONGO_URI = secret.db_url;

// const connectDB = async () => {
//   try {
//     await mongoose.connect(MONGO_URI);
//     console.log('mongodb connection success!');
//   } catch (err) {
//     console.log('mongodb connection failed!', err.message);
//   }
// };

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    // Enhanced connection options
    const connectOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // 15 seconds
      socketTimeoutMS: 45000, // 45 seconds
      heartbeatFrequencyMS: 10000, // 10 seconds
      retryWrites: true,
      maxPoolSize: 10,
      // Force node to use IPv4 over IPv6
      family: 4,
    };

    const connection = await mongoose.connect(MONGO_URI, connectOptions);

    // Add global connection error handler to prevent app crashes
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      // Don't throw the error - just log it to avoid crashing the application
    });

    // Handle disconnections and attempt to reconnect
    mongoose.connection.on('disconnected', () => {
      // Reconnection will be handled automatically by mongoose
    });

    return connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);

    // Log but don't throw errors - prevent server crash on DB connection issues
    // This allows the server to still handle API requests even if DB is down

    // Optional: Set a reconnection timer
    setTimeout(() => {
      dbConnect().catch(err => {
        console.error('Reconnection attempt failed:', err.message);
      });
    }, 10000);
  }
};

// Process-wide unhandled rejection handler to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  // No need to exit process - let it continue running
});

// Process-wide uncaught exception handler to prevent crashes
process.on('uncaughtException', error => {
  // Only exit on truly fatal errors
  if (error.code === 'EADDRINUSE') {
    process.exit(1);
  }
  // For other errors, log but don't crash
});

module.exports = connectDB;
