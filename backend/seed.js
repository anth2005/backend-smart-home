require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Kiểm tra xem đã có admin chưa
    const adminCu = await User.findOne({ username: 'admin' });
    if (adminCu) {
      console.log('✅ Tài khoản "admin" đã tồn tại.');
      process.exit();
    }

    await User.create({
      username: 'admin',
      password: 'admin123',
      email: 'admin@smarthome.local',
      role: 'admin',
      isActive: true
    });

    console.log('🎉 Đã tạo tài khoản cứng:');
    console.log('   Tên đăng nhập: admin');
    console.log('   Mật khẩu: admin123');
    process.exit();
  } catch (err) {
    console.error('Lỗi tạo admin:', err);
    process.exit(1);
  }
}

seedAdmin();
