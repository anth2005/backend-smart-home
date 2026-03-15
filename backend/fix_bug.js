require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function fixAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔄 Đã kết nối Database. Đang dọn dẹp...');

    // 1. Xóa toàn bộ user "admin" cũ bị lỗi Hash mật khẩu
    await User.deleteMany({ username: 'admin' });
    
    // 2. Tạo mã băm trực tiếp (đáng tin cậy 100%)
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // 3. Tạo lại admin vào thẳng CSDL (bỏ qua hook để tránh side effect)
    await User.collection.insertOne({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@smarthome.local',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ HỆ THỐNG ĐÃ ĐƯỢC RESET TÀI KHOẢN ADMIN.');
    console.log('👉 Tên đăng nhập: admin');
    console.log('👉 Mật khẩu: admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  }
}

fixAll();
