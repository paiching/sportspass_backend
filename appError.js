// appError.js
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;  // Optional: flag to distinguish operational errors from programming errors
    }
}

module.exports = AppError;
