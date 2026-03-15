const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function resetAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Đã kết nối DB.');

  let admin = await User.findOne({ username: 'admin' });
  if (admin) {
    admin.password = 'admin123';
    await admin.save(); // Kích hoạt lại hook mã hóa
    console.log('✅ Đã nạp lại mật khẩu "admin123" cho tài khoản admin.');
  } else {
    console.log('❌ Không tìm thấy admin!');
  }
  process.exit(0);
}
resetAdmin();
