const turf = require('@turf/turf');



// ham check 1 diem co nam trong 1 Xa khong
function isPointInsideGeoJSON(point, geojson) {
  const pointToCheck = turf.point(point);
  const isInside = turf.booleanPointInPolygon(pointToCheck, geojson.geometry);
  return isInside;
}



module.exports = {
  isPointInsideGeoJSON,
};
// Hàm đếm số điểm trong vùng GeoJSON
function countPointsInsideGeoJSON(points, geoJSON) {
  let count = 0;
  // Duyệt qua mỗi điểm trong mảng points
  for (const point of points) {
    // Kiểm tra xem điểm có nằm trong vùng GeoJSON không
    if (isPointInsideGeoJSON(point, geoJSON)) {
      count++;
    }
  }

  return count;
}
// hàm đếm số điểm trong 1 xã và kiểm tra xem có đử số liệu để thống kê không


// hàm tính trung bình của mỗi xã

