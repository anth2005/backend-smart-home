require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const MQTTService = require('./services/mqttService');
const errorHandler = require('./middleware/errorHandler');

// Import các route
const authRoutes   = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dataRoutes   = require('./routes/data');
const userRoutes   = require('./routes/users');

// ── Khởi tạo ứng dụng ────────────────────────────────
const app = express();
const server = http.createServer(app);

// Cấu hình Socket.io cho kết nối real-time với frontend
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// ── Middleware ────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ghi log mọi request đến server
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Kiểm tra sức khỏe hệ thống ───────────────────────
app.get('/health', (req, res) => {
  const mqttService = req.app.get('mqttService');
  res.json({
    status: 'ok',
    thoiGianHoatDong: `${Math.floor(process.uptime())} giây`,
    thoiGianHienTai: new Date(),
    mqtt: mqttService ? mqttService.getStatus() : { connected: false }
  });
});

// ── Đăng ký các route API ─────────────────────────────
app.use('/api/auth',    authRoutes);    // Đăng nhập, đăng ký
app.use('/api/devices', deviceRoutes);  // Quản lý và điều khiển thiết bị
app.use('/api/data',    dataRoutes);    // Dữ liệu cảm biến và thống kê
app.use('/api/users',   userRoutes);    // Quản lý người dùng (Admin)

// Xử lý route không tồn tại
app.use((req, res) => {
  res.status(404).json({ success: false, msg: `Đường dẫn ${req.originalUrl} không tồn tại` });
});

// Middleware xử lý lỗi tập trung (phải đặt cuối cùng)
app.use(errorHandler);

// ── Sự kiện WebSocket (Socket.io) ────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client kết nối: ${socket.id}`);

  // Gửi trạng thái MQTT ngay khi client kết nối
  const mqttService = app.get('mqttService');
  if (mqttService) {
    socket.emit('mqttStatus', mqttService.getStatus());
  }

  // Client hỏi trạng thái MQTT
  socket.on('getMqttStatus', () => {
    const svc = app.get('mqttService');
    socket.emit('mqttStatus', svc ? svc.getStatus() : { connected: false });
  });

  // Client gửi lệnh điều khiển qua WebSocket (thay thế REST API cho độ trễ thấp)
  socket.on('controlDevice', async ({ deviceId, action, payload }) => {
    const svc = app.get('mqttService');
    if (!svc) return;
    try {
      const Device = require('./models/Device');
      const thietBi = await Device.findById(deviceId);
      if (!thietBi) return;
      svc.publishCommand(`${thietBi.mqttTopic}/command`, { action, payload, deviceId });
      console.log(`[WS] Điều khiển thiết bị qua WebSocket: ${thietBi.name} → ${action}`);
    } catch (err) {
      console.error('[WS] Lỗi điều khiển thiết bị:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client ngắt kết nối: ${socket.id}`);
  });
});

// ── Khởi động server ──────────────────────────────────
const khoiDongServer = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Đã kết nối MongoDB');

    // Khởi tạo MQTT sau khi database sẵn sàng
    const mqttService = new MQTTService(io);
    mqttService.connect();
    app.set('mqttService', mqttService);
    app.set('io', io);

    const CONG = process.env.PORT || 5000;
    server.listen(CONG, () => {
      console.log(`\n🚀 Server Nhà Thông Minh đang chạy tại http://localhost:${CONG}`);
      console.log(`📡 WebSocket đã sẵn sàng`);
      console.log(`🔗 Kiểm tra hệ thống: http://localhost:${CONG}/health`);
      console.log(`\n📋 Danh sách API:`);
      console.log(`   POST /api/auth/register        – Đăng ký`);
      console.log(`   POST /api/auth/login            – Đăng nhập`);
      console.log(`   GET  /api/auth/me               – Thông tin cá nhân`);
      console.log(`   GET  /api/devices               – Danh sách thiết bị`);
      console.log(`   POST /api/devices/:id/toggle    – Bật/Tắt thiết bị`);
      console.log(`   POST /api/devices/:id/control   – Điều khiển thiết bị`);
      console.log(`   GET  /api/data/summary          – Tổng quan dashboard`);
      console.log(`   GET  /api/data/history          – Lịch sử cảm biến`);
      console.log(`   GET  /api/data/stats            – Thống kê biểu đồ`);
      console.log(`   GET  /api/data/logs             – Lịch sử điều khiển\n`);
    });

    // Tắt server an toàn khi nhận tín hiệu SIGTERM
    process.on('SIGTERM', () => {
      console.log('\nĐang tắt server...');
      mqttService.disconnect();
      server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('❌ Lỗi khởi động server:', err.message);
    process.exit(1);
  }
};

khoiDongServer();
