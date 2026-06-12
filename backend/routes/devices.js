const express = require('express');
const { run, get, all } = require('../database');
const { authenticateToken } = require('../auth');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const router = express.Router();
router.use(authenticateToken);

// 获取设备列表（分页+搜索+筛选）
router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword, district_id, status, sortBy = 'id', sortOrder = 'DESC' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];

  if (keyword) {
    where.push('(d.name LIKE ? OR d.device_code LIKE ? OR d.terminal_code LIKE ? OR d.road_section LIKE ? OR d.location LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw, kw);
  }
  if (district_id) {
    where.push('d.district_id = ?');
    params.push(district_id);
  }
  if (status) {
    where.push('d.status = ?');
    params.push(status);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = ['id', 'device_code', 'name', 'created_at', 'status', 'capacity'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'id';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const totalRow = get(`SELECT COUNT(*) as total FROM devices d ${whereClause}`, params);
  const total = totalRow ? totalRow.total : 0;

  const rows = all(`
    SELECT d.*, dt.name as district_name
    FROM devices d
    LEFT JOIN districts dt ON d.district_id = dt.id
    ${whereClause}
    ORDER BY d.${sort} ${order}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), offset]);

  res.json({
    list: rows,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

// 获取单个设备
router.get('/:id', (req, res) => {
  const device = get(`
    SELECT d.*, dt.name as district_name
    FROM devices d
    LEFT JOIN districts dt ON d.district_id = dt.id
    WHERE d.id = ?
  `, [req.params.id]);

  if (!device) return res.status(404).json({ error: '设备不存在' });
  res.json(device);
});

// 新增设备
router.post('/', (req, res) => {
  const { device_code, terminal_code, name, district_id, road_section, location, longitude, latitude,
    transformer_type, capacity, manufacturer, power_account, control_box, low_voltage_info,
    external_power, install_date, status, remark } = req.body;

  if (!device_code) return res.status(400).json({ error: '设备编码不能为空' });
  if (!name) return res.status(400).json({ error: '设备名称不能为空' });

  try {
    const result = run(`
      INSERT INTO devices (device_code, terminal_code, name, district_id, road_section, location, longitude, latitude,
        transformer_type, capacity, manufacturer, power_account, control_box, low_voltage_info, external_power, install_date, status, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [device_code, terminal_code || '', name, district_id || null, road_section || '', location || '', longitude || null, latitude || null,
      transformer_type || '', capacity || null, manufacturer || '', power_account || '', control_box || '',
      low_voltage_info || '', external_power || '', install_date || '', status || 'normal', remark || '']);

    run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, '新增', '专变台账', `新增设备: ${name}`]);

    res.json({ id: result.lastInsertRowid, message: '新增成功' });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '设备编码已存在' });
    }
    res.status(500).json({ error: e.message });
  }
});

// 更新设备
router.put('/:id', (req, res) => {
  const device = get('SELECT * FROM devices WHERE id = ?', [req.params.id]);
  if (!device) return res.status(404).json({ error: '设备不存在' });

  const { device_code, terminal_code, name, district_id, road_section, location, longitude, latitude,
    transformer_type, capacity, manufacturer, power_account, control_box, low_voltage_info,
    external_power, install_date, status, remark } = req.body;

  try {
    run(`
      UPDATE devices SET device_code=?, terminal_code=?, name=?, district_id=?, road_section=?, location=?,
        longitude=?, latitude=?, transformer_type=?, capacity=?, manufacturer=?, power_account=?, control_box=?,
        low_voltage_info=?, external_power=?, install_date=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `, [
      device_code || device.device_code, terminal_code || device.terminal_code, name || device.name,
      district_id || device.district_id, road_section || device.road_section, location || device.location,
      longitude ?? device.longitude, latitude ?? device.latitude, transformer_type || device.transformer_type,
      capacity ?? device.capacity, manufacturer || device.manufacturer, power_account || device.power_account,
      control_box || device.control_box, low_voltage_info || device.low_voltage_info,
      external_power || device.external_power, install_date || device.install_date, status || device.status,
      remark ?? device.remark, req.params.id
    ]);

    run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, '编辑', '专变台账', `编辑设备: ${name || device.name}`]);

    res.json({ message: '更新成功' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 删除设备
router.delete('/:id', (req, res) => {
  const device = get('SELECT * FROM devices WHERE id = ?', [req.params.id]);
  if (!device) return res.status(404).json({ error: '设备不存在' });

  run('UPDATE devices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['deleted', req.params.id]);

  run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.user.username, '删除', '专变台账', `删除设备: ${device.name}`]);

  res.json({ message: '删除成功' });
});

// 导出Excel
router.get('/export/excel', (req, res) => {
  const { keyword, district_id, status } = req.query;
  let where = [], params = [];
  if (keyword) {
    where.push('(d.name LIKE ? OR d.device_code LIKE ? OR d.road_section LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (district_id) { where.push('d.district_id = ?'); params.push(district_id); }
  if (status) { where.push('d.status = ?'); params.push(status); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const rows = all(`
    SELECT d.*, dt.name as district_name FROM devices d
    LEFT JOIN districts dt ON d.district_id = dt.id ${whereClause} ORDER BY d.id
  `, params);

  const data = rows.map(r => ({
    '设备编码': r.device_code, '终端编号': r.terminal_code, '设备名称': r.name,
    '区划': r.district_name, '路段': r.road_section, '位置': r.location,
    '经度': r.longitude, '纬度': r.latitude, '变压器型号': r.transformer_type,
    '容量(KVA)': r.capacity, '制造商': r.manufacturer, '状态': r.status, '备注': r.remark
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '专变设备台账');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=devices.xlsx');
  res.send(buf);
});

// 导入Excel
router.post('/import/excel', upload.single('file'), (req, res) => {
  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    let success = 0, failed = 0;

    data.forEach(row => {
      try {
        run(`
          INSERT INTO devices (device_code, terminal_code, name, district_id, road_section, location, longitude, latitude,
            transformer_type, capacity, manufacturer, status, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row['设备编码'] || `ZB${Date.now()}`, row['终端编号'] || '', row['设备名称'] || '',
          null, row['路段'] || '', row['位置'] || '', row['经度'] || null, row['纬度'] || null,
          row['变压器型号'] || '', row['容量(KVA)'] || null, row['制造商'] || '',
          row['状态'] || 'normal', row['备注'] || ''
        ]);
        success++;
      } catch (e) { failed++; }
    });

    run('INSERT INTO operation_logs (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, '导入', '专变台账', `导入完成: 成功${success}条, 失败${failed}条`]);

    res.json({ message: `导入完成: 成功${success}条, 失败${failed}条`, success, failed });
  } catch (e) {
    res.status(500).json({ error: '文件解析失败: ' + e.message });
  }
});

module.exports = router;
