require('dotenv').config({ path: './.env' });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDBs = require('./db'); 
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const ticketsRouter = require('./routes/tickets');
const eventsRouter = require('./routes/events');
const sessionsRouter = require('./routes/sessions');
const tagsRouter = require('./routes/tags');
const ordersRouter = require('./routes/orders');
const greensRouter = require('./routes/green');
const notificationsRouter = require('./routes/notifications');
const subscriptionsRouter = require('./routes/subscriptions');
const handleError = require('./middlewares/errorHandler');

const app = express();
app.use(express.json());

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 提供Socket.IO客户端库
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')));

connectDBs();

// Set the view engine to EJS
app.set('view engine', 'ejs');

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/v1/user', usersRouter);
app.use('/api/v1/ticket', ticketsRouter);
app.use('/api/v1/event', eventsRouter);
app.use('/api/v1/session', sessionsRouter);
app.use('/api/v1/tag', tagsRouter);
app.use('/api/v1/notification', notificationsRouter);
app.use('/api/v1/subscription', subscriptionsRouter);
app.use('/api/v1/order', ordersRouter);
app.use('/order', ordersRouter);
app.use('/green', greensRouter);

// socket路由範例
app.get('/admin', (req, res) => {
  res.render('adminSocket');
});

app.get('/client', (req, res) => {
  res.render('clientSocket');
});

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

module.exports = app;
