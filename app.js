require('dotenv').config({ path: './.env' });
//console.log("MongoDB URI:", process.env.DATABASE_Atlas);

var express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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
var ordersRouter = require('./routes/orders');
var greensRouter = require('./routes/green');
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


//app.use('/api/v1/users/forgotpassword', usersRouter);
//app.use('/api/v1/users/resetpassword/:token', usersRouter);

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


//這邊開始Socket

const server = http.createServer(app);
const io = socketIo(server);

const notifications = io.of('/notifications');

io.on('connection', (socket) => {
  console.log('用户已连接');

  socket.on('sendNotification', (data) => {
    console.log('收到通知:', data);
    io.emit('receiveNotification', data);
  });

  socket.on('disconnect', () => {
    console.log('用户已断开连接');
  });
});

const PORT = process.env.socket_PORT || 3003;
server.listen(PORT, () => {
  console.log(`服务器正在运行在端口 ${PORT}`);
});



module.exports = app;