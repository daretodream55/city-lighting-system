const express = require('express');
const { run, get, all } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();
router.use(authenticateToken);

// 获取运维记录列表
router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword, maintenance_type, status, device_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];

  if (keyword) {
    where.push('(m.title LIKE ? OR m.handler LIKE ? OR d.name LIKE ? OR d.device_code LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  if (maintenance_type) { where.push('m.maintenance_type = ?'); params.push(maintenance_type); }
  if (status) { where.push('m.status = ?'); params.push(status); }
  if (device_id) { where.push('m.device_id = ?'); params.push(device_id); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const totalRow = get(`SELECT COUNT(*) as total FROM maintenance_records m LEFT JOIN devices d ON m.device_id = d.id ${whereClause}`, params);
  const total = totalRow ? totalRow.total : 0;

  const rows = all(`
    SELECT m.*, d.name as device_name, d.device_code, dt.name as district_name
    FROM maintenance_records m
    LEFT JOIN devices d ON m.device_id = d.id
    LEFT JOIN districts dt ON d.district_id = dt.id
    ${whereClause}
    ORDER BY m.maintenance_date DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), offset]);

  res.json({ list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// 获取单个运维记录
router.get('/:id', (req, res) => {
  const record = get(`
    SELECT m.*, d.name as device_name, d.device_code
    FROM maintenance_records m
    LEFT JOIN devices d ON m.device_id = d.id
    WHERE m.id = ?
  `, [req.params.id]);

  if (!record) return res.status(404).json({ error: '记录不存在' });
  res.json(record);
});

// 新增运维记录
router.post('/', (req, res) => {
  const { device_id, maintenance_type, title, description, result, maintenance_date,
    next_maintenance_date, cost, handler, status, remark } = req.body;

  if (!device_id || !title || !maintenance_date) {
    return res.status(400).json({ error: '设备、标题和日期不能为空' });
  }

  const result2 = run(`
    INSERT INTO maintenance_records (device_id, maintenance_type, title, description, result, maintenance_date, next_maintenance_date, cost, handler, status, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [device_id, maintenance_type || 'routine', title, description || '', result || '', maintenance_date,
    next_maintenance_date || null, cost || 0, handler || '', status || 'pending', remark || '']);

  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '新增', '运维管理', `新增运维: ${title}`]);

  res.json({ id: result2.lastInsertRowid, message: '新增成功' });
});

// 更新运维记录
router.put('/:id', (req, res) => {
  const record = get('SELECT * FROM maintenance_records WHERE id = ?', [req.params.id]);
  if (!record) return res.status(404).json({ error: '记录不存在' });

  const { device_id, maintenance_type, title, description, result, maintenance_date,
    next_maintenance_date, cost, handler, status, remark } = req.body;

  run(`
    UPDATE maintenance_records SET device_id=?, maintenance_type=?, title=?, description=?, result=?,
      maintenance_date=?, next_maintenance_date=?, cost=?, handler=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `, [
    device_id || record.device_id, maintenance_type || record.maintenance_type, title || record.title,
    description ?? record.description, result ?? record.result, maintenance_date || record.maintenance_date,
    next_maintenance_date ?? record.next_maintenance_date, cost ?? record.cost, handler ?? record.handler,
    status || record.status, remark ?? record.remark, req.params.id
  ]);

  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '编辑', '运维管理', `编辑运维: ${title || record.title}`]);

  res.json({ message: '更新成功' });
});

// 删除运维记录
router.delete('/:id', (req, res) => {
  const record = get('SELECT * FROM maintenance_records WHERE id = ?', [req.params.id]);
  if (!record) return res.status(404).json({ error: '记录不存在' });

  run('DELETE FROM maintenance_records WHERE id = ?', [req.params.id]);

  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '删除', '运维管理', `删除运维: ${record.title}`]);

  res.json({ message: '删除成功' });
});

// 运维类型统计
router.get('/stats/type', (req, res) => {
  const stats = all(`
    SELECT maintenance_type, COUNT(*) as count
    FROM maintenance_records GROUP BY maintenance_type
  `);

  const typeMap = {
    routine: '例行维护', repair: '故障抢修', inspection: '季度巡检',
    annual: '年度检修', preventive: '预防性试验', room: '电房整治',
    component: '元器件更换', other: '其他'
  };

  res.json(stats.map(s => ({ ...s, name: typeMap[s.maintenance_type] || s.maintenance_type })));
});

// 获取待维护提醒
router.get('/reminders/pending', (req, res) => {
  const config = get("SELECT config_value FROM system_config WHERE config_key = 'maintenance_remind_days'");
  const remindDays = config ? parseInt(config.config_value) : 7;
  const today = new Date().toISOString().split('T')[0];

  const rows = all(`
    SELECT m.*, d.name as device_name, d.device_code
    FROM maintenance_records m
    LEFT JOIN devices d ON m.device_id = d.id
    WHERE m.status != 'completed'
      AND m.next_maintenance_date IS NOT NULL
      AND m.next_maintenance_date <= date(?, '+' || ? || ' days')
    ORDER BY m.next_maintenance_date ASC
  `, [today, remindDays]);

  res.json(rows);
});

module.exports = router;
