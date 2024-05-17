require('dotenv').config(); // 加载环境变量

const mongoose = require('mongoose');
const Ticket = require('./models/ticketsModel');
const Order = require('./models/ordersModel');
const Event = require('./models/eventsModel');
const Session = require('./models/sessionsModel');

mongoose.connect(process.env.DATABASE_Atlas).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

const seedData = async () => {
  try {
    // 创建示例订单
    const orders = await Order.insertMany([
      {
        orderList: [
          {
            areaColor: 'Red',
            areaName: 'Area A',
            areaPrice: 150,
            ticketName: 'VIP',
            price: 200,
            seats: [
              { seatNumber: 1, isBooked: true },
              { seatNumber: 2, isBooked: false }
            ],
            ticketNumber: 2
          }
        ],
        userId: new mongoose.Types.ObjectId(),
        sponsorId: new mongoose.Types.ObjectId(),
        ticketId: new mongoose.Types.ObjectId(),
        eventId: new mongoose.Types.ObjectId(),
        sessionId: new mongoose.Types.ObjectId(),
        salesList: [new mongoose.Types.ObjectId()],
        ticketSales: 10,
        salesTotal: 1000,
        unTicket: 0,
        unTicketTotal: 0,
        orderTotal: 1000,
        totalAmount: 1000,
        orderState: 'paid',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 创建示例事件
    const events = await Event.insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        orderId: orders[0]._id,
        eventSetting: [{ key: 'setting1', value: 'value1' }],
        eventName: 'Concert A',
        eventDate: new Date(),
        eventPic: 'eventPicUrl',
        coverPic: 'coverPicUrl',
        smallBanner: 'smallBannerUrl',
        categoryId: new mongoose.Types.ObjectId(),
        tagId: new mongoose.Types.ObjectId(),
        releaseDate: new Date(),
        eventIntro: 'This is a concert event.',
        sessionId: new mongoose.Types.ObjectId(),
        sponsorId: new mongoose.Types.ObjectId(),
        favoriteId: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 创建示例会话
    const sessions = await Session.insertMany([
      {
        eventId: events[0]._id,
        isEdit: false,
        sessionSetting: [{ key: 'setting1', value: 'value1' }],
        sessionName: 'Morning Session',
        sessionTime: new Date(),
        sessionPlace: 'Main Hall',
        sessionSalesPeriod: new Date(),
        areaSetting: [
          {
            areaVenuePic: 'venuePicUrl',
            areaColor: 'Blue',
            areaName: 'Area B',
            areaPrice: 100,
            areaTicketType: [
              { ticketName: 'Standard', ticketDiscount: 10, areaNumber: 100 }
            ]
          }
        ],
        orderId: orders[0]._id,
        notifyId: new mongoose.Types.ObjectId(),
        sessionState: 'open',
        bookTicket: 50,
        enterVenue: 45,
        seatsTotal: 100,
        detailEventUrl: 'eventUrl',
        seatsAvailable: 50,
        isSoldOut: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 创建示例票据
    const tickets = [
      {
        ticketId: new mongoose.Types.ObjectId(),
        orderId: orders[0]._id,
        eventId: events[0]._id,
        sessionId: sessions[0]._id,
        price: '100',
        status: true,
        unTicketReason: '',
        notes: 'First ticket',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await Ticket.insertMany(tickets);
    console.log('Data seeded');
    process.exit();
  } catch (error) {
    console.error('Error seeding data', error);
    process.exit(1);
  }
};

seedData();
