const express = require('express')
const { ObjectId } = require('mongodb')
const { connectToDb, getDb} = require('./db')
const mongoose = require('mongoose');
    //tao app và phần giữa
const app = express()
const http = require("http");
const cors = require("cors");
const { Server } = require ("socket.io");
const server = http.createServer(app);
const geojsonUtils = require('./function');
const mqtt = require('mqtt')




const io = new Server(server, {
  cors: {
      origin: "*"
  }
})
server.listen(3001, () => {
  console.log("server running")
});

io.on("connection", (socket, message) => {
  console.log("a user connect")
  
  socket.on("disconnect", () => {
      console.log("a user disconnected!")

  })
})
const getData = (message) => io.emit(`realtime`, { payload: message })

const client = mqtt.connect("mqtt://45.117.83.198:1883");
let topic = 'application/3/device/645c2f483d650dc6/event/up'
client.on("connect", () => {
  console.log('connected')
  client.subscribe(topic, (err)=>{
    if(err){
      console.log(err)
    }
  })
});



client.on("message",(topic, message) => {
  // message is Buffer
  console.log(`this message:${message}`);
  io.emit('mqttData', message.toString());
   io.emit("welcome", "testing socket")
  // client.end();`
});


let db
connectToDb((err)=>{
    if(!err){
            app.listen(3002, () => {
                console.log('app listening on port 3002')
            })
        db = getDb()
       
    }
})
let  datas;

// // Định nghĩa tuyến API để lấy dữ liệu từ MongoDB
// const dbDatas = mongoose.connection;

// dbDatas.on('error', console.error.bind(console, 'Lỗi kết nối đến MongoDB:'));
// dbDatas.once('open', () => {
//   console.log('Kết nối thành công đến MongoDB');
// });


//socket
// io.on('connection', (socket) => {
//   console.log('A user connected');
//   setInterval(sendApiCalledEvent, 60000); 
//   socket.on('disconnect', () => {
//       console.log('A user disconnected');
//   });
// });


setInterval(sendApiCalledEvent, 60000); 



const otherDb = mongoose.connection;
mongoose.connect('mongodb://localhost:27017/airMain', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
otherDb.on('error', (error) => {
  console.error('Lỗi kết nối đến cơ sở dữ liệu khác:', error);
});

otherDb.once('open', () => {
  console.log('Kết nối đến cơ sở dữ liệu khác thành công');
});




const dataSchema = new mongoose.Schema({
   
    "timeSystem":String,
    "data": String,
    "objectJSON": {
      "data": {
        "Dust": {
          "pm10_ug/m3": Number,
          "pm1_ug/m3":Number,
          "pm25_ug/m3": Number
        },
        "Location": {
          "latitude": Number,
          "longitude": Number
        }
      }
    },
   "rxInfo":[{
    "gatewayID":String,
    "rssi":String,
   }]
}
);

const DataModel = mongoose.model('Data', dataSchema);

// Khai báo biến để theo dõi xem hàm đã được gọi tự động hay chưa
let isAutoRunning = false;
const AirQualityModel = mongoose.model('Data', dataSchema);

async function fetchData(limit = 1) {
  try {
    const airQualityData = await AirQualityModel.find({}).limit(limit).sort({ _id: -1 }).exec();
   
    return airQualityData;
  } catch (error) {
    console.error('Lỗi truy xuất dữ liệu:', error);
    throw error; // Chuyển lại lỗi để xử lý ở phía calling code nếu cần
  }
}
app.use(cors());
app.get('/oneday', async (req, res) => {
  try {
    const result = await fetchData(300); // Thay 5 bằng giá trị limit mong muốn
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu:', error);
    res.status(500).json({ error: 'Lỗi khi xử lý yêu cầu' });
  }
});
app.get('/onehour', async (req, res) => {
  try {
    const result = await fetchData(60); // Thay 5 bằng giá trị limit mong muốn
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu:', error);
    res.status(500).json({ error: 'Lỗi khi xử lý yêu cầu' });
  }
});




async function performTaskAndSaveToOtherDb() {
  if (!isAutoRunning) {
    isAutoRunning = true;
    try {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZFVUkiOiI2NDVjMmY0ODNkNjUwZGM2IiwiYXBwSUQiOiIzIiwiZW1haWwiOiJuZ3ZhbnRpZW4yMTA0QGdtYWlsLmNvbSIsInBhc3N3b3JkIjoidGllbjA5NzY3MjAyMjUiLCJpYXQiOjE2OTY2NjU2MTV9.xzLjdXfJ3WuuulVtRwxhxHQ40eV8xCKpLuRHUq4GNws");
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        "limit": 1
      });

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
      };

      // Lấy dữ liệu từ API
      const response = await fetch("https://api.vngalaxy.vn/api/uplink/", requestOptions);
      if (response.ok) {
        const doc = await response.json();
        if (doc && doc.data && doc.data.length > 0) {
          // Lấy dữ liệu đầu tiên từ mảng data
          const dataItem = doc.data[0];  
          console.log(dataItem) 
          
          const lastData = await DataModel.findOne().sort({ _id: -1 });

          if (lastData && lastData.timeSystem === dataItem.timeSystem) {
            console.log('Dữ liệu cuối cùng trùng với timeSystem, không gửi lên.');
          } else {
            console.log('Dữ liệu cuối cùng không trùng với timeSystem, tiến hành lưu dữ liệu và gửi lên.');
            // Xóa trường _id
            delete dataItem._id;
            const newData = new DataModel({
              timeSystem:dataItem.timeSystem,
              objectJSON:dataItem.objectJSON,
              rxInfo:dataItem.rxInfo.map((val)=>{
                return {
                  gatewayID:val.gatewayID,
                  rssi:val.rssi
                }
              })
            });
            // Thực hiện lưu newData vào cơ sở dữ liệu
            await newData.save();
            console.log('Dữ liệu đã được ghi lên cơ sở dữ liệu khác');
          }
        } else {
          console.log('Không tìm thấy dữ liệu');
        }
      } else {
        throw new Error(`Không thể lấy dữ liệu. Lỗi HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('Xảy ra lỗi:', error);
    } finally {
      isAutoRunning = false; // Đánh dấu rằng hàm đã hoàn thành
    }
  }
}

function sendApiCalledEvent() {
  performTaskAndSaveToOtherDb();

}




