require('dotenv').config({ path: './.env' });
//console.log("MongoDB URI:", process.env.DATABASE_Atlas);

var express = require('express');
const connectDBs = require('./db'); 
//const connectDB = require('./dbs'); 
var cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var ticketsRouter = require('./routes/tickets');
var eventsRouter = require('./routes/events');
var sessionsRouter = require('./routes/sessions');
var tagsRouter = require('./routes/tags');
var notificationsRouter = require('./routes/notifications');
var subscriptionsRouter = require('./routes/subscriptions');
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

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/v1/user', usersRouter);
app.use('/api/v1/ticket', ticketsRouter);
app.use('/api/v1/event', eventsRouter);
app.use('/api/v1/session', sessionsRouter);
app.use('/api/v1/tag', tagsRouter);
app.use('/api/v1/notification', notificationsRouter);
app.use('/api/v1/subscription', subscriptionsRouter);
//app.use('/api/v1/users/forgotpassword', usersRouter);
//app.use('/api/v1/users/resetpassword/:token', usersRouter);

// 錯誤處理中間件
app.use((req, res, next) => {
    res.status(404).json({
      status: 'fail',
      message: `Cannot find ${req.originalUrl} on this server!`
    });
  });
  
  // 全局錯誤處理
  app.use((err, req, res, next) => {
    console.error('ERROR 💥', err);
    res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message
    });
  });

// 在所有路由之後加入錯誤處理middleware
//app.use(handleError);

module.exports = app;
