const express = require('express');
const { run, get, all } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();
router.use(authenticateToken);

// ==================== 路灯表箱 ====================
router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword, district_id, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [], params = [];
  if (keyword) {
    where.push('(s.name LIKE ? OR s.box_code LIKE ? OR s.road_section LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (district_id) { where.push('s.district_id = ?'); params.push(district_id); }
  if (status) { where.push('s.status = ?'); params.push(status); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const total = get(`SELECT COUNT(*) as total FROM street_lights s ${whereClause}`, params)?.total || 0;
  const rows = all(`
    SELECT s.*, dt.name as district_name FROM street_lights s
    LEFT JOIN districts dt ON s.district_id = dt.id ${whereClause}
    ORDER BY s.id DESC LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), offset]);

  res.json({ list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', (req, res) => {
  const item = get(`SELECT s.*, dt.name as district_name FROM street_lights s LEFT JOIN districts dt ON s.district_id = dt.id WHERE s.id = ?`, [req.params.id]);
  if (!item) return res.status(404).json({ error: '记录不存在' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { box_code, terminal_code, terminal_name, name, district_id, road_section, location, longitude, latitude, light_count, power_load, controller_type, install_date, status, remark } = req.body;
  if (!box_code) return res.status(400).json({ error: '表箱编码不能为空' });
  if (!terminal_code) return res.status(400).json({ error: '终端编号不能为空' });
  if (!terminal_name) return res.status(400).json({ error: '终端名称不能为空' });
  if (!name) return res.status(400).json({ error: '名称不能为空' });
  try {
    const r = run(`INSERT INTO street_lights (box_code, terminal_code, terminal_name, name, district_id, road_section, location, longitude, latitude, light_count, power_load, controller_type, install_date, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [box_code, terminal_code, terminal_name, name, district_id || null, road_section || '', location || '', longitude || null, latitude || null, light_count || 0, power_load || 0, controller_type || '', install_date || '', status || 'normal', remark || '']);
    run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?,?,?,?,?)', [req.user.id, req.user.username, '新增', '路灯表箱', `新增: ${name}`]);
    res.json({ id: r.lastInsertRowid, message: '新增成功' });
  } catch (e) { res.status(400).json({ error: e.message.includes('UNIQUE') ? '编码已存在' : e.message }); }
});

router.put('/:id', (req, res) => {
  const item = get('SELECT * FROM street_lights WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: '记录不存在' });
  const b = req.body;
  run(`UPDATE street_lights SET box_code=?,terminal_code=?,terminal_name=?,name=?,district_id=?,road_section=?,location=?,longitude=?,latitude=?,light_count=?,power_load=?,controller_type=?,install_date=?,status=?,remark=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [b.box_code||item.box_code, b.terminal_code??item.terminal_code, b.terminal_name??item.terminal_name, b.name||item.name, b.district_id??item.district_id, b.road_section??item.road_section, b.location??item.location, b.longitude??item.longitude, b.latitude??item.latitude, b.light_count??item.light_count, b.power_load??item.power_load, b.controller_type??item.controller_type, b.install_date??item.install_date, b.status||item.status, b.remark??item.remark, req.params.id]);
  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?,?,?,?,?)', [req.user.id, req.user.username, '编辑', '路灯表箱', `编辑: ${b.name||item.name}`]);
  res.json({ message: '更新成功' });
});

router.delete('/:id', (req, res) => {
  const item = get('SELECT * FROM street_lights WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: '记录不存在' });
  run('DELETE FROM street_lights WHERE id = ?', [req.params.id]);
  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?,?,?,?,?)', [req.user.id, req.user.username, '删除', '路灯表箱', `删除: ${item.name}`]);
  res.json({ message: '删除成功' });
});

module.exports = router;
