const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DATABASE_Atlas;

let client = null;
let dbInstance = null;


//資料庫單例模式
const connect = async () => {
  if (dbInstance) return dbInstance; // 如果已經連線，直接返回連線實例
  try {
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: ServerApiVersion.v1,
        // useNewUrlParser: true,  //depreicated
        // useUnifiedTopology: true,
      });
    }
    await client.connect();
    dbInstance = client.db('sportspass'); // 設定資料庫
    console.log("Connected to MongoDB Atlas");
    return dbInstance;
  } catch (error) {
    console.error("Could not connect to MongoDB Atlas", error);
    throw error;
  }
};

const disconnect = async () => {
  if (!client) return true;
  await client.close();
  client = null;
  dbInstance = null;
  console.log("Disconnected from MongoDB");
};

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

module.exports = { connect, disconnect };
