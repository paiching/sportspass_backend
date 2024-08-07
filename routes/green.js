const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const qs = require('qs');
const ecpay_payment = require('ecpay_aio_nodejs');
const Order = require('../models/ordersModel'); 
require('dotenv').config(); 


function verifyCheckMacValue(data) {
  const { ECPAY_HASH_KEY, ECPAY_HASH_IV } = process.env;
  let raw = `HashKey=${ECPAY_HASH_KEY}&${Object.keys(data).sort().map(key => `${key}=${data[key]}`).join('&')}&HashIV=${ECPAY_HASH_IV}`;
  raw = encodeURIComponent(raw).toLowerCase().replace(/%20/g, '+').replace(/%2d/g, '-').replace(/%5f/g, '_').replace(/%2e/g, '.').replace(/%2a/g, '*');
  const hash = crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
  return hash === data.CheckMacValue;
}

async function updateOrderStatus(orderID, status) {
  try {
    // 使用 findById 查找訂單
    const order = await Order.findById(orderID);
    if (!order) {
      console.error(`Order with ID ${orderID} not found`);
      return;
    }
    order.status = status;
    await order.save();
    console.log(`Order with ID ${orderID} has been updated to status ${status}`);
  } catch (error) {
    console.error(`Error updating order status: ${error}`);
  }
}

router.post('/ecpay-return', async (req, res) => {
  console.log('ECPay Return Data:', req.body);
  const data = req.body;

//  if (verifyCheckMacValue(data)) {
    if (data.RtnCode === '1') {
      const orderID = data.CustomField1;
      await updateOrderStatus(orderID, 1);
      res.status(200).send('1|OK');
    } else {
      res.status(400).send('Transaction Failed');
    }
  // } else {
  //   res.status(400).send('CheckMacValue Verification Failed');
  // }
});


router.get('/', (req, res) => {
  //<form action="/api/v1/green/createOrder" method="POST">
  res.send(`
    <form action="https://sportspass-api-server.onrender.com/api/v1/green/checkout" method="POST">
      <label for="itemName">Item Name:</label>
      <input type="text" id="itemName" name="itemName"><br>
      <label for="itemPrice">Item Price:</label>
      <input type="text" id="itemPrice" name="itemPrice"><br>
      <input type="text" id="orderID" name="orderID"><br>
      <button type="submit">Create Order</button>
    </form>
  `);
});

router.post('/checkout', (req, res) => {
  const { itemName, itemPrice, orderID } = req.body;

  if (!itemName || !itemPrice || !orderID) {
      return res.status(400).json({ error: 'Item name, price, and order ID are required' });
  }
  
  const MerchantTradeNo = generateUUID();

  const base_param = {
      MerchantTradeNo: MerchantTradeNo, // 包含 orderID
      MerchantTradeDate: moment().format('YYYY/MM/DD HH:mm:ss'), 
      TotalAmount: itemPrice,
      TradeDesc: '測試交易描述',
      ItemName: itemName,
      ReturnURL: process.env.ECPAY_RETURN_URL,
      ClientBackURL: 'https://node-js-frontend-2024-ruddy.vercel.app/member/myTicket',
      CustomField1: orderID
  };

  const options = {
      "OperationMode": "Test", //Test or Production
      "MercProfile": {
          "MerchantID": process.env.ECPAY_MERCHANT_ID,
          "HashKey": process.env.ECPAY_HASH_KEY,
          "HashIV": process.env.ECPAY_HASH_IV
      },
      "IgnorePayment": [
          // "Credit",
          // "WebATM",
          // "ATM",
          // "CVS",
          // "BARCODE",
          // "AndroidPay"
      ],
      "IsProjectContractor": false
  };

  let inv_params = {
      // RelateNumber: 'PLEASE MODIFY',  //請帶30碼uid ex: SJDFJGH24FJIL97G73653XM0VOMS4K
      // CustomerID: 'MEM_0000001',  //會員編號
      // CustomerIdentifier: '',   //統一編號
      // CustomerName: '測試買家',
      // CustomerAddr: '測試用地址',
      // CustomerPhone: '0123456789',
      // CustomerEmail: 'johndoe@test.com',
      // ClearanceMark: '2',
      // TaxType: '1',
      // CarruerType: '',
      // CarruerNum: '',
      // Donation: '2',
      // LoveCode: '',
      // Print: '1',
      // InvoiceItemName: '測試商品1|測試商品2',
      // InvoiceItemCount: '2|3',
      // InvoiceItemWord: '個|包',
      // InvoiceItemPrice: '35|10',
      // InvoiceItemTaxType: '1|1',
      // InvoiceRemark: '測試商品1的說明|測試商品2的說明',
      // DelayDay: '0',
      // InvType: '07'
  };

  console.log('options:', options);

  const create = new ecpay_payment(options);
  const htm = create.payment_client.aio_check_out_all(parameters = base_param, invoice = inv_params);
  console.log(htm);
  //res.render('checkout',{title: 'Express', checkoutForm: htm});
  res.send(htm);
});



function generateUUID() {
  const timestamp = Date.now().toString().slice(-10); 
  const randomString = crypto.randomBytes(5).toString('hex').slice(0, 10); 
  return timestamp + randomString;
}


router.post('/createOrder', async (req, res) => {
  const { itemName, itemPrice } = req.body;


const MerchantTradeNo = generateUUID();


  const orderData = {
    MerchantID: process.env.ECPAY_MERCHANT_ID,
    MerchantTradeNo: MerchantTradeNo,
    MerchantTradeDate: moment().format('YYYY/MM/DD HH:mm:ss'),
    PaymentType: 'aio',
    TotalAmount: itemPrice,
    TradeDesc: 'Test Order',
    ItemName: itemName,
    ReturnURL: process.env.ECPAY_RETURN_URL,
    ChoosePayment: 'Credit',
    EncryptType: 1
  };



  // 生成 CheckMacValue
  const checkMacValue = generateCheckValue(orderData);
  orderData.CheckMacValue = checkMacValue;

  try {
    
    const response = await axios.post(process.env.ECPAY_PAYMENT_URL, qs.stringify(orderData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    res.send(response.data);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send('Error creating order');
  }
});

// 生成 CheckMacValue
function generateCheckValue(params) {
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // 加入 HashKey 和 HashIV
  const raw = `HashKey=${process.env.ECPAY_HASH_KEY}&${sortedParams}&HashIV=${process.env.ECPAY_HASH_IV}`;

  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%20/g, '+');

  const hash = crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
  return hash;
}

module.exports = router;
