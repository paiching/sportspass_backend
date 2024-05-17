require('dotenv').config({ path: './.env' });
//console.log("MongoDB URI:", process.env.DATABASE_Atlas);

var express = require('express');
const connectDBs = require('./db'); // 引入新的db连接文件
const connectDB = require('./dbs'); // 引入新的db连接文件
var cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var ticketsRouter = require('./routes/tickets');
const handleError = require('./middlewares/errorHandler');

var app = express();
app.use(express.json());

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

connectDBs();

//middleware
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/v1/user', usersRouter);
app.use('/api/v1/ticket', ticketsRouter);

// After all other routes
app.use((req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Cannot find ${req.originalUrl} on this server!`
    });
});

// 在所有路由之後加入錯誤處理middleware
//app.use(handleError);

module.exports = app;
