const express = require('express');
const { run, get, all } = require('../database');
const { authenticateToken, requireAdmin } = require('../auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(authenticateToken);

// ==================== 区划管理 ====================
router.get('/districts', (req, res) => {
  const districts = all('SELECT * FROM districts ORDER BY sort_order');
  res.json(districts);
});

// ==================== 用户管理 ====================
router.get('/users', requireAdmin, (req, res) => {
  const { page = 1, pageSize = 20, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = '', params = [];
  if (keyword) {
    where = 'WHERE username LIKE ? OR realname LIKE ?';
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }

  const totalRow = get(`SELECT COUNT(*) as total FROM users ${where}`, params);
  const total = totalRow ? totalRow.total : 0;

  const rows = all(`
    SELECT id, username, realname, role, status, created_at
    FROM users ${where}
    ORDER BY id LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), offset]);

  res.json({ list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.post('/users', requireAdmin, (req, res) => {
  const { username, password, realname, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = run('INSERT INTO users (username, password, realname, role) VALUES (?, ?, ?, ?)',
      [username, hash, realname || '', role || 'viewer']);
    run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, '新增', '用户管理', `新增用户: ${username}`]);
    res.json({ id: result.lastInsertRowid, message: '新增成功' });
  } catch (e) {
    res.status(400).json({ error: '用户名已存在' });
  }
});

router.put('/users/:id', requireAdmin, (req, res) => {
  const { realname, role, status, password } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    run('UPDATE users SET realname=?, role=?, status=?, password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [realname || user.realname, role || user.role, status ?? user.status, hash, req.params.id]);
  } else {
    run('UPDATE users SET realname=?, role=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [realname || user.realname, role || user.role, status ?? user.status, req.params.id]);
  }

  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '编辑', '用户管理', `编辑用户: ${user.username}`]);
  res.json({ message: '更新成功' });
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (user.username === 'admin') {
    return res.status(400).json({ error: '不能删除超级管理员' });
  }
  run('DELETE FROM users WHERE id = ?', [req.params.id]);
  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '删除', '用户管理', `删除用户: ${user.username}`]);
  res.json({ message: '删除成功' });
});

// ==================== 操作日志 ====================
router.get('/logs', (req, res) => {
  const { page = 1, pageSize = 20, keyword, module: mod } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [], params = [];
  if (keyword) {
    where.push('(username LIKE ? OR detail LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (mod) { where.push('module = ?'); params.push(mod); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const totalRow = get(`SELECT COUNT(*) as total FROM operation_logs ${whereClause}`, params);
  const total = totalRow ? totalRow.total : 0;

  const rows = all(`
    SELECT * FROM operation_logs ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), offset]);

  res.json({ list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// ==================== 系统配置 ====================
router.get('/config', (req, res) => {
  const configs = all('SELECT * FROM system_config');
  res.json(configs);
});

router.put('/config', (req, res) => {
  const configs = req.body;

  Object.entries(configs).forEach(([key, value]) => {
    run('UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?',
      [String(value), key]);
  });

  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '修改', '系统配置', '更新系统参数']);
  res.json({ message: '配置已保存' });
});

// ==================== 统计报表 ====================
router.get('/stats/devices', (req, res) => {
  const stats = all(`
    SELECT status, COUNT(*) as count FROM devices
    WHERE status != 'deleted' GROUP BY status
  `);

  const statusMap = { normal: '正常', fault: '故障中', maintenance: '待维护', repair: '待抢修', scrapped: '已报废' };
  res.json(stats.map(s => ({ ...s, name: statusMap[s.status] || s.status })));
});

router.get('/stats/district', (req, res) => {
  const stats = all(`
    SELECT dt.name, COUNT(d.id) as count
    FROM districts dt
    LEFT JOIN devices d ON d.district_id = dt.id AND d.status != 'deleted'
    GROUP BY dt.id ORDER BY count DESC
  `);
  res.json(stats);
});

router.get('/stats/monthly', (req, res) => {
  const stats = all(`
    SELECT strftime('%Y-%m', maintenance_date) as month, maintenance_type, COUNT(*) as count
    FROM maintenance_records
    GROUP BY month, maintenance_type
    ORDER BY month DESC
  `);
  res.json(stats);
});

router.get('/dashboard', (req, res) => {
  const totalDevices = get("SELECT COUNT(*) as cnt FROM devices WHERE status != 'deleted'");
  const normalDevices = get("SELECT COUNT(*) as cnt FROM devices WHERE status = 'normal'");
  const faultDevices = get("SELECT COUNT(*) as cnt FROM devices WHERE status IN ('fault','repair')");
  const pendingMaintenance = get("SELECT COUNT(*) as cnt FROM maintenance_records WHERE status IN ('pending','in_progress')");
  const streetLightCount = get("SELECT COUNT(*) as cnt FROM street_lights");
  const landscapeCount = get("SELECT COUNT(*) as cnt FROM landscape_boxes");

  res.json({
    totalDevices: totalDevices ? totalDevices.cnt : 0,
    normalDevices: normalDevices ? normalDevices.cnt : 0,
    faultDevices: faultDevices ? faultDevices.cnt : 0,
    pendingMaintenance: pendingMaintenance ? pendingMaintenance.cnt : 0,
    streetLightCount: streetLightCount ? streetLightCount.cnt : 0,
    landscapeCount: landscapeCount ? landscapeCount.cnt : 0,
    onlineRate: (totalDevices && totalDevices.cnt > 0) ? ((normalDevices.cnt / totalDevices.cnt) * 100).toFixed(1) : 0
  });
});

module.exports = router;
