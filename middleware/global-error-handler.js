import { secret } from '../config/secret.js';
import ApiError from '../errors/api-error.js';
import handleCastError from '../errors/handle-cast-error.js';
import handleValidationError from '../errors/handle-validation-error.js';

const globalErrorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong !';
  let errorMessages = [];

  if (error?.name === 'ValidationError') {
    const simplifiedError = handleValidationError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (error?.name === 'CastError') {
    const simplifiedError = handleCastError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (error instanceof ApiError) {
    statusCode = error?.statusCode;
    message = error.message;
    errorMessages = error?.message
      ? [
          {
            path: '',
            message: error?.message,
          },
        ]
      : [];
  } else if (error instanceof Error) {
    message = error?.message;
    errorMessages = error?.message
      ? [
          {
            path: '',
            message: error?.message,
          },
        ]
      : [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: secret.env !== 'production' ? error?.stack : undefined,
  });
};

export default globalErrorHandler;
