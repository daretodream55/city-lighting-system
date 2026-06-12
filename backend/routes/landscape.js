const express = require('express');
const { run, get, all } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();
router.use(authenticateToken);

// ==================== 景观表箱 ====================
router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword, district_id, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [], params = [];
  if (keyword) {
    where.push('(l.name LIKE ? OR l.box_code LIKE ? OR l.road_section LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (district_id) { where.push('l.district_id = ?'); params.push(district_id); }
  if (status) { where.push('l.status = ?'); params.push(status); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const total = get(`SELECT COUNT(*) as total FROM landscape_boxes l ${whereClause}`, params)?.total || 0;
  const rows = all(`
    SELECT l.*, dt.name as district_name FROM landscape_boxes l
    LEFT JOIN districts dt ON l.district_id = dt.id ${whereClause}
    ORDER BY l.id DESC LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), offset]);

  res.json({ list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', (req, res) => {
  const item = get(`SELECT l.*, dt.name as district_name FROM landscape_boxes l LEFT JOIN districts dt ON l.district_id = dt.id WHERE l.id = ?`, [req.params.id]);
  if (!item) return res.status(404).json({ error: '记录不存在' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { box_code, name, district_id, road_section, location, longitude, latitude, scene_type, light_count, power_load, control_mode, install_date, status, remark } = req.body;
  if (!box_code) return res.status(400).json({ error: '表箱编码不能为空' });
  if (!name) return res.status(400).json({ error: '名称不能为空' });
  try {
    const r = run(`INSERT INTO landscape_boxes (box_code, name, district_id, road_section, location, longitude, latitude, scene_type, light_count, power_load, control_mode, install_date, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [box_code || `JG${Date.now()}`, name, district_id || null, road_section || '', location || '', longitude || null, latitude || null, scene_type || '', light_count || 0, power_load || 0, control_mode || '', install_date || '', status || 'normal', remark || '']);
    run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?,?,?,?,?)', [req.user.id, req.user.username, '新增', '景观表箱', `新增: ${name}`]);
    res.json({ id: r.lastInsertRowid, message: '新增成功' });
  } catch (e) { res.status(400).json({ error: e.message.includes('UNIQUE') ? '编码已存在' : e.message }); }
});

router.put('/:id', (req, res) => {
  const item = get('SELECT * FROM landscape_boxes WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: '记录不存在' });
  const b = req.body;
  run(`UPDATE landscape_boxes SET box_code=?,name=?,district_id=?,road_section=?,location=?,longitude=?,latitude=?,scene_type=?,light_count=?,power_load=?,control_mode=?,install_date=?,status=?,remark=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [b.box_code||item.box_code, b.name||item.name, b.district_id??item.district_id, b.road_section??item.road_section, b.location??item.location, b.longitude??item.longitude, b.latitude??item.latitude, b.scene_type??item.scene_type, b.light_count??item.light_count, b.power_load??item.power_load, b.control_mode??item.control_mode, b.install_date??item.install_date, b.status||item.status, b.remark??item.remark, req.params.id]);
  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?,?,?,?,?)', [req.user.id, req.user.username, '编辑', '景观表箱', `编辑: ${b.name||item.name}`]);
  res.json({ message: '更新成功' });
});

router.delete('/:id', (req, res) => {
  const item = get('SELECT * FROM landscape_boxes WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ error: '记录不存在' });
  run('DELETE FROM landscape_boxes WHERE id = ?', [req.params.id]);
  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?,?,?,?,?)', [req.user.id, req.user.username, '删除', '景观表箱', `删除: ${item.name}`]);
  res.json({ message: '删除成功' });
});

module.exports = router;
