const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authGuard } = require('../middleware/auth');

// ============================================================
// POST /api/auth/register – Đăng ký tài khoản mới
// ============================================================
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, msg: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }

    // Kiểm tra tên đăng nhập hoặc email đã tồn tại chưa
    const nguoiDungCu = await User.findOne({ $or: [{ username }, { email }] });
    if (nguoiDungCu) {
      return res.status(400).json({ success: false, msg: 'Tên đăng nhập hoặc email đã được sử dụng' });
    }

    const nguoiDung = await User.create({ username, email, password, role });

    // Tạo JWT token sau khi đăng ký thành công
    const token = jwt.sign({ id: nguoiDung._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      success: true,
      msg: 'Đăng ký tài khoản thành công',
      token,
      user: nguoiDung
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/auth/login – Đăng nhập
// ============================================================
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, msg: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    // Tìm user theo tên đăng nhập
    const nguoiDung = await User.findOne({ username });
    if (!nguoiDung) {
      return res.status(401).json({ success: false, msg: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    if (!nguoiDung.isActive) {
      return res.status(403).json({ success: false, msg: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
    const hopLe = await nguoiDung.comparePassword(password);
    if (!hopLe) {
      return res.status(401).json({ success: false, msg: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    // Cập nhật lần đăng nhập cuối
    nguoiDung.lastLogin = new Date();
    await nguoiDung.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: nguoiDung._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      success: true,
      msg: 'Đăng nhập thành công',
      token,
      user: nguoiDung
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/auth/me – Lấy thông tin người dùng hiện tại
// ============================================================
router.get('/me', authGuard, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ============================================================
// PUT /api/auth/change-password – Đổi mật khẩu
// ============================================================
router.put('/change-password', authGuard, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, msg: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }

    const nguoiDung = await User.findById(req.user._id);
    const hopLe = await nguoiDung.comparePassword(currentPassword);
    if (!hopLe) {
      return res.status(401).json({ success: false, msg: 'Mật khẩu hiện tại không đúng' });
    }

    nguoiDung.password = newPassword;
    await nguoiDung.save();

    res.json({ success: true, msg: 'Đổi mật khẩu thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
