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

const io = new Server(server, {
  cors: {
      origin: "http://localhost:3000",
      methods: ["GET","POST"],
  }
})
server.listen(30010, () => {
  console.log("server running")
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

io.on('connection', (socket) => {
  console.log('A user connected');
  setInterval(sendApiCalledEvent, 60000); 
  socket.on('disconnect', () => {
      console.log('A user disconnected');
  });
});
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
   
  
}
);

const DataModel = mongoose.model('Data', dataSchema);

// Khai báo biến để theo dõi xem hàm đã được gọi tự động hay chưa
let isAutoRunning = false;

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
          console.log(doc) 
          // Xóa trường _id
          delete dataItem._id;
          const newData = new DataModel(dataItem);
          
          await newData.save();
           const testdb= DataModel.find({})
            .then((result) => {
              console.log('Dữ liệu từ truy vấn findOne:', result);
            })
            .catch((error) => {
              console.error('Lỗi khi lấy dữ liệu:', error);
            })
          datas =testdb;
          console.log(testdb)
          console.log('Dữ liệu đã được ghi lên cơ sở dữ liệu khác');
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
// // Sử dụng setInterval để tự động gọi hàm performTaskAndSaveToOtherDb mỗi 1 phút (60,000 milliseconds)
function sendApiCalledEvent() {
  performTaskAndSaveToOtherDb();
  io.emit('test', 'API đã được gọi');
  console.log("test da dươc gui")
}



// //test 1 điểm có nằm trong 1 vùng không , khi hoàn thiện thì xóa phần này 
// const geojsonChecker = require('./function'); // Đường dẫn đến tệp geojsonChecker.js
// // Đối tượng GeoJSON
// const geojsonObject = {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[108.18542480468761,16.042131423950195],[108.17884826660156,16.061971664428825],[108.17873382568371,16.061887741088867],[108.17329406738281,16.058227539062614],[108.17409515380865,16.055522918701172],[108.17237091064459,16.05503463745123],[108.17210388183588,16.056072235107422],[108.17118835449219,16.056062698364258],[108.1714706420899,16.054210662841797],[108.17042541503906,16.053966522216797],[108.17169189453136,16.051048278808594],[108.17082977294922,16.050891876220646],[108.17176818847656,16.045928955078182],[108.17082977294922,16.044469833373967],[108.1693801879884,16.044313430786246],[108.16439819335943,16.038373947143555],[108.1643676757813,16.03733634948736],[108.172592163086,16.03825187683111],[108.1767349243164,16.040258407592717],[108.18542480468761,16.042131423950195]]]},"properties":{"GID_0":"VNM","NAME_0":"Vietnam","GID_1":"VNM.19_1","NAME_1":"Đà Nẵng","NL_NAME_1":"","GID_2":"VNM.19.1_1","NAME_2":"Cẩm Lệ","NL_NAME_2":"","GID_3":"VNM.19.1.1_1","NAME_3":"Hòa An","VARNAME_3":"Hoa An","NL_NAME_3":"","TYPE_3":"Phường","ENGTYPE_3":"Ward","CC_3":"","HASC_3":""}};

// // Điểm bạn muốn kiểm tra
// const pointToCheck = 
//   [108.17923615484756,
//     16.0583009897384]
// ; // Thay thế bằng tọa độ của điểm kiểm tra

// // Sử dụng hàm từ tệp geojsonChecker.js để kiểm tra xem điểm có thuộc vùng GeoJSON hay không
// const isInside = geojsonChecker.isPointInsideGeoJSON(pointToCheck, geojsonObject);

// if (isInside) {
//   console.log(`Điểm ${pointToCheck} nằm trong vùng.${geojsonObject.properties.NAME_3}`);
// } else {
//   console.log(`Điểm ${pointToCheck} nằm ngoài vùng.`);
// }



//  //test đếm số điểm trong 1 vùng , khi hoàn thiện thì xóa phần này 
app.get('/data',(req,res)=>{
 
  
  res.json({mssg: "test"})
})