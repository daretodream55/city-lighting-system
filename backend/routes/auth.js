const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get } = require('../database');
const { generateToken, authenticateToken } = require('../auth');

const router = express.Router();

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  if (user.status === 0) {
    return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = generateToken(user);

  run('INSERT INTO operation_logs (user_id, username, action, module, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, user.username, '登录', '系统', '用户登录系统', req.ip]);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      realname: user.realname,
      role: user.role
    }
  });
});

// 获取当前用户信息
router.get('/profile', authenticateToken, (req, res) => {
  const user = get('SELECT id, username, realname, role, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
});

// 修改密码
router.put('/password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);

  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: '原密码错误' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, req.user.id]);

  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '修改密码', '系统', '修改登录密码']);

  res.json({ message: '密码修改成功' });
});

module.exports = router;
