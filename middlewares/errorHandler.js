// errorMiddleware.js
const AppError = require('../appError');

const handleError = (err, req, res, next) => {
    // 預設狀態碼和錯誤訊息
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        // 在開發環境中，提供錯誤堆棧資訊
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack
        });
    } else if (process.env.NODE_ENV === 'production') {
        // 在生產環境中，隱藏系統錯誤詳情，並處理操作性錯誤
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            // 對於未知錯誤，返回通用訊息
            console.error('ERROR 💥', err);
            res.status(500).json({
                status: 'error',
                message: 'Something went very wrong!'
            });
        }
    }
};

module.exports = handleError;
