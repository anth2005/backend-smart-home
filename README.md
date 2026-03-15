# 🏠 Nhà Thông Minh – Smart Home IoT System

Hệ thống nhà thông minh sử dụng **Node.js**, **MongoDB**, **MQTT** và **Socket.io** để giám sát và điều khiển thiết bị trong nhà theo thời gian thực.

---

## 📐 Kiến trúc hệ thống

```
[Thiết bị IoT / ESP32]
        ↕ MQTT
[MQTT Broker (Mosquitto)]
        ↕ MQTT
[Backend Node.js]
   ├── REST API (Express)
   ├── WebSocket (Socket.io)
   └── MongoDB (Dữ liệu)
        ↕ HTTP / WebSocket
[Frontend Next.js Dashboard]
```

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Backend | Node.js + Express.js |
| Cơ sở dữ liệu | MongoDB + Mongoose |
| Giao tiếp thiết bị | MQTT (mqtt.js) |
| Real-time | Socket.io |
| Xác thực | JWT (JSON Web Token) |
| Bảo mật mật khẩu | Bcrypt |

---

## 📁 Cấu trúc thư mục

```
backend/
├── server.js                    # Điểm khởi động server
├── .env                         # Biến môi trường (không commit)
├── middleware/
│   ├── auth.js                  # Xác thực JWT + phân quyền
│   └── errorHandler.js          # Xử lý lỗi tập trung
├── models/
│   ├── User.js                  # Model người dùng
│   ├── Device.js                # Model thiết bị (đèn, quạt, camera...)
│   ├── SensorData.js            # Model dữ liệu cảm biến
│   └── CommandLog.js            # Lịch sử lệnh điều khiển
├── controllers/
│   └── deviceController.js      # Logic xử lý thiết bị
├── routes/
│   ├── auth.js                  # API đăng nhập / đăng ký
│   ├── devices.js               # API quản lý thiết bị
│   ├── data.js                  # API dữ liệu & thống kê
│   └── users.js                 # API quản lý người dùng
└── services/
    └── mqttService.js           # Kết nối & xử lý MQTT
```

---

## 🚀 Cài đặt và chạy

### Yêu cầu
- Node.js >= 18
- MongoDB (local hoặc Atlas)
- MQTT Broker (Mosquitto hoặc test.mosquitto.org)

### Các bước cài đặt

```bash
# 1. Clone repository
git clone https://github.com/<username>/<repo-name>.git
cd <repo-name>/backend

# 2. Cài đặt thư viện
npm install

# 3. Tạo file .env (copy từ .env.example)
cp .env.example .env

# 4. Chỉnh sửa .env theo môi trường của bạn
# PORT=5000
# MONGODB_URI=mongodb://127.0.0.1:27017/smarthome
# JWT_SECRET=your_secret_key
# MQTT_BROKER_URL=mqtt://localhost:1883

# 5. Chạy server (development)
npm run dev

# 6. Chạy server (production)
npm start
```

---

## 📋 Danh sách API

### 🔑 Xác thực

| Phương thức | Endpoint | Mô tả |
|------------|----------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Thông tin cá nhân |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |

### 📟 Thiết bị

| Phương thức | Endpoint | Mô tả |
|------------|----------|-------|
| GET | `/api/devices` | Danh sách thiết bị |
| GET | `/api/devices/:id` | Chi tiết thiết bị |
| POST | `/api/devices` | Thêm thiết bị *(Admin)* |
| PUT | `/api/devices/:id` | Cập nhật thiết bị *(Admin)* |
| DELETE | `/api/devices/:id` | Xóa thiết bị *(Admin)* |
| POST | `/api/devices/:id/toggle` | **Bật/Tắt nhanh** |
| POST | `/api/devices/:id/control` | Gửi lệnh điều khiển |
| GET | `/api/devices/:id/history` | Lịch sử cảm biến |
| GET | `/api/devices/:id/logs` | Lịch sử điều khiển |

### 📊 Dữ liệu

| Phương thức | Endpoint | Mô tả |
|------------|----------|-------|
| GET | `/api/data/summary` | Tổng quan dashboard |
| GET | `/api/data/history` | Lịch sử cảm biến |
| GET | `/api/data/stats` | Thống kê theo giờ (biểu đồ) |
| GET | `/api/data/logs` | Lịch sử lệnh điều khiển |

---

## 🔌 WebSocket Events

### Server → Frontend

| Event | Mô tả |
|-------|-------|
| `deviceStateChanged` | Trạng thái thiết bị thay đổi (đèn/quạt bật/tắt) |
| `sensorUpdate` | Dữ liệu cảm biến mới (nhiệt độ, độ ẩm...) |
| `cameraEvent` | Sự kiện camera AI (nhận diện khuôn mặt) |
| `mqttStatus` | Trạng thái kết nối MQTT broker |

### Frontend → Server

| Event | Mô tả |
|-------|-------|
| `controlDevice` | Điều khiển thiết bị qua WebSocket |
| `getMqttStatus` | Hỏi trạng thái MQTT |

---

## 📡 Cấu trúc MQTT Topics

| Topic | Chiều | Mô tả |
|-------|-------|-------|
| `smarthome/sensor/<loai>` | MCU → Backend | Dữ liệu cảm biến |
| `smarthome/camera/<sukien>` | MCU → Backend | Sự kiện camera AI |
| `smarthome/device/<id>/state` | MCU → Backend | Trạng thái thực của thiết bị |
| `smarthome/device/<id>/command` | Backend → MCU | Lệnh điều khiển |
| `smarthome/status/<id>` | MCU → Backend | Heartbeat |

---

## 🧪 Kiểm thử API

Import file `SmartHome_API.postman_collection.json` vào Postman để kiểm thử toàn bộ API.

---

## 👨‍💻 Tác giả

Đồ án môn học – Sinh viên Việt Nam
