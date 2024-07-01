const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const qs = require('qs');
const ecpay_payment = require('ecpay_aio_nodejs');
require('dotenv').config(); 

router.get('/', (req, res) => {
  res.send(`
    <form action="/green/createOrder" method="POST">
      <label for="itemName">Item Name:</label>
      <input type="text" id="itemName" name="itemName"><br>
      <label for="itemPrice">Item Price:</label>
      <input type="text" id="itemPrice" name="itemPrice"><br>
      <button type="submit">Create Order</button>
    </form>
  `);
});

router.post('/checkout', (req, res) => {

    const { itemName, itemPrice } = req.body;

    if (!itemName || !itemPrice) {
        return res.status(400).json({ error: 'Item name and price are required' });
    }
    
    const MerchantTradeNo = generateUUID();

    const base_param = {
        MerchantTradeNo: MerchantTradeNo, //請帶20碼uid, ex: f0a0d7e9fae1bb72bc93
        MerchantTradeDate: moment().format('YYYY/MM/DD HH:mm:ss'), 
        TotalAmount: itemPrice,
        TradeDesc: '測試交易描述',
        ItemName: itemName,
        ReturnURL: 'http://192.168.0.1',
      }

      const options = {
        "OperationMode": "Test", //Test or Production
        "MercProfile": {
          "MerchantID": process.env.ECPAY_MERCHANT_ID,
          "HashKey": process.env.ECPAY_HASH_KEY,
          "HashIV": process.env.ECPAY_HASH_IV
        },
        "IgnorePayment": [
      //    "Credit",
      //    "WebATM",
      //    "ATM",
      //    "CVS",
      //    "BARCODE",
      //    "AndroidPay"
        ],
        "IsProjectContractor": false
      }
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
      }
      
      console.log('options:', options);

      create = new ecpay_payment(options),
      htm = create.payment_client.aio_check_out_all(parameters = base_param, invoice = inv_params)
      console.log(htm);

      // res.render('checkout',{title: 'Express', checkoutForm: htm});
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
