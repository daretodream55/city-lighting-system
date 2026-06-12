const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'city_lighting.db');

let db = null;

// 获取或初始化数据库
async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

// 保存数据库到文件
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// 执行查询（带参数绑定）
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] };
}

// 查询单条记录
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// 查询多条记录
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

// 直接执行SQL（用于初始化）
function exec(sql) {
  db.run(sql);
  saveDb();
}

// 初始化数据库表和数据
async function initDatabase() {
  const d = await getDb();

  exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      realname TEXT DEFAULT '',
      role TEXT DEFAULT 'viewer',
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_code TEXT UNIQUE NOT NULL,
      terminal_code TEXT,
      name TEXT NOT NULL,
      district_id INTEGER,
      road_section TEXT,
      location TEXT,
      longitude REAL,
      latitude REAL,
      transformer_type TEXT,
      capacity REAL,
      manufacturer TEXT,
      power_account TEXT,
      control_box TEXT,
      low_voltage_info TEXT,
      external_power TEXT,
      install_date TEXT,
      status TEXT DEFAULT 'normal',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      maintenance_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      result TEXT,
      maintenance_date TEXT NOT NULL,
      next_maintenance_date TEXT,
      cost REAL DEFAULT 0,
      handler TEXT,
      status TEXT DEFAULT 'pending',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS street_lights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_code TEXT UNIQUE NOT NULL,
      terminal_code TEXT,
      terminal_name TEXT,
      name TEXT NOT NULL,
      district_id INTEGER,
      road_section TEXT,
      location TEXT,
      longitude REAL,
      latitude REAL,
      light_count INTEGER DEFAULT 0,
      power_load REAL DEFAULT 0,
      controller_type TEXT,
      install_date TEXT,
      status TEXT DEFAULT 'normal',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS landscape_boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      district_id INTEGER,
      road_section TEXT,
      location TEXT,
      longitude REAL,
      latitude REAL,
      scene_type TEXT,
      light_count INTEGER DEFAULT 0,
      power_load REAL DEFAULT 0,
      control_mode TEXT,
      install_date TEXT,
      status TEXT DEFAULT 'normal',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 种子数据
  seedData();

  console.log('数据库初始化完成');
}

function seedData() {
  // 管理员
  const adminExists = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    run('INSERT INTO users (username, password, realname, role) VALUES (?, ?, ?, ?)',
      ['admin', hash, '系统管理员', 'admin']);
  }

  // 区划
  const districtCount = get('SELECT COUNT(*) as cnt FROM districts');
  if (districtCount.cnt === 0) {
    const districts = [
      '珠晖区', '雁峰区', '石鼓区', '蒸湘区', '南岳区',
      '衡阳县', '衡南县', '衡山县', '衡东县', '祁东县',
      '耒阳市', '常宁市'
    ];
    districts.forEach((d, i) => {
      run('INSERT INTO districts (name, sort_order) VALUES (?, ?)', [d, i + 1]);
    });
  }

  // 系统配置
  const configCount = get('SELECT COUNT(*) as cnt FROM system_config');
  if (configCount.cnt === 0) {
    const configs = [
      ['maintenance_remind_days', '7', '维护提醒提前天数'],
      ['map_default_center', '26.893,112.572', '地图默认中心点（衡阳市）'],
      ['map_default_zoom', '12', '地图默认缩放级别'],
      ['system_name', '城市照明专变管理系统', '系统名称'],
      ['page_size', '20', '默认分页大小']
    ];
    configs.forEach(c => {
      run('INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)', c);
    });
  }

  // 示例设备
  const deviceCount = get('SELECT COUNT(*) as cnt FROM devices');
  if (deviceCount.cnt === 0) {
    const devices = [
      ['ZB2024001', 'T001', '解放大道1号专变', 1, '解放大道', '解放大道与蒸湘路交叉口', 112.576, 26.895, 'S11-M-315/10', 315, '衡阳变压器厂', 'HY-2024-001', 'KZX-001', 'normal', '正常运行'],
      ['ZB2024002', 'T002', '船山路2号专变', 2, '船山路', '船山路中段', 112.568, 26.892, 'S13-M-400/10', 400, '特变电工', 'HY-2024-002', 'KZX-002', 'normal', ''],
      ['ZB2024003', 'T003', '衡州大道3号专变', 3, '衡州大道', '衡州大道与蔡伦大道交汇', 112.582, 26.888, 'SCB10-500/10', 500, '衡阳变压器厂', 'HY-2024-003', 'KZX-003', 'fault', '变压异常需检修'],
      ['ZB2024004', 'T004', '蒸阳路4号专变', 4, '蒸阳路', '蒸阳路北段', 112.574, 26.899, 'S11-M-250/10', 250, '特变电工', 'HY-2024-004', 'KZX-004', 'normal', ''],
      ['ZB2024005', 'T005', '白沙洲5号专变', 2, '白沙洲', '白沙洲工业园入口', 112.595, 26.858, 'S13-M-630/10', 630, 'ABB', 'HY-2024-005', 'KZX-005', 'maintenance', '计划季度检修'],
      ['ZB2024006', 'T006', '华新大道6号专变', 4, '华新大道', '华新大道与芙蓉路交叉', 112.555, 26.891, 'SCB11-800/10', 800, '施耐德', 'HY-2024-006', 'KZX-006', 'normal', ''],
      ['ZB2024007', 'T007', '蒸湘南路7号专变', 4, '蒸湘南路', '蒸湘南路万达广场旁', 112.563, 26.884, 'S11-M-315/10', 315, '衡阳变压器厂', 'HY-2024-007', 'KZX-007', 'normal', ''],
      ['ZB2024008', 'T008', '蔡伦大道8号专变', 3, '蔡伦大道', '蔡伦大道南段', 112.588, 26.875, 'S13-M-500/10', 500, '特变电工', 'HY-2024-008', 'KZX-008', 'fault', '漏油待抢修'],
      ['ZB2024009', 'T009', '东风路9号专变', 1, '东风路', '东风路与衡州大道交汇', 112.589, 26.887, 'SCB10-400/10', 400, 'ABB', 'HY-2024-009', 'KZX-009', 'scrapped', '已报废'],
      ['ZB2024010', 'T010', '立新大道10号专变', 4, '立新大道', '立新大道西段', 112.548, 26.893, 'S11-M-200/10', 200, '施耐德', 'HY-2024-010', 'KZX-010', 'normal', ''],
    ];

    devices.forEach(d => {
      try {
        run(`INSERT INTO devices (device_code, terminal_code, name, district_id, road_section, location, longitude, latitude,
          transformer_type, capacity, manufacturer, power_account, control_box, status, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, d);
      } catch (e) { /* skip dupes */ }
    });
  }

  // 示例运维记录
  const recordCount = get('SELECT COUNT(*) as cnt FROM maintenance_records');
  if (recordCount.cnt === 0) {
    const records = [
      [1, 'routine', '一季度例行巡检', '检查变压器运行温度、油位、接线', '各项指标正常', '2024-01-15', '2024-04-15', 0, '张工', 'completed'],
      [2, 'routine', '一季度例行巡检', '常规巡检维护', '设备运行正常', '2024-01-20', '2024-04-20', 0, '李工', 'completed'],
      [3, 'repair', '变压器异常抢修', '变压器温度过高报警，需紧急处理', '更换散热风扇，温度恢复正常', '2024-02-10', null, 1200, '王工', 'completed'],
      [5, 'inspection', '二季度巡检计划', '计划进行全面检查和预防性试验', null, '2024-06-15', '2024-09-15', 0, '张工', 'pending'],
      [8, 'repair', '漏油抢修', '发现变压器漏油，需立即处理', null, '2024-03-01', null, 0, '赵工', 'in_progress'],
      [4, 'component', '电容器更换', '电容器老化，容量不足', '更换新电容器，测试通过', '2024-01-28', null, 800, '李工', 'completed'],
      [7, 'routine', '一季度例行巡检', '常规检查', '正常', '2024-01-18', '2024-04-18', 0, '张工', 'completed'],
    ];

    records.forEach(r => {
      try {
        run(`INSERT INTO maintenance_records (device_id, maintenance_type, title, description, result, maintenance_date, next_maintenance_date, cost, handler, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, r);
      } catch (e) { /* skip */ }
    });
  }

  // 示例路灯表箱
  const slCount = get('SELECT COUNT(*) as cnt FROM street_lights');
  if (slCount.cnt === 0) {
    const slData = [
      ['LD2024001', 'T-LD-001', '解放大道终端01', '解放大道路灯表箱01', 1, '解放大道', '解放大道东段', 112.578, 26.898, 48, 12.5, 'PLC-4G', '2024-01-10', 'normal', ''],
      ['LD2024002', 'T-LD-002', '船山路终端01', '船山路路灯表箱01', 2, '船山路', '船山路西段', 112.565, 26.893, 36, 9.2, 'PLC-4G', '2024-02-15', 'normal', ''],
      ['LD2024003', 'T-LD-003', '衡州大道终端01', '衡州大道路灯表箱01', 3, '衡州大道', '衡州大道中段', 112.585, 26.885, 60, 15.8, 'NB-IoT', '2024-01-20', 'normal', ''],
      ['LD2024004', 'T-LD-004', '蒸阳路终端01', '蒸阳路路灯表箱01', 4, '蒸阳路', '蒸阳路南段', 112.572, 26.896, 42, 10.5, 'PLC-4G', '2024-03-01', 'fault', '控制器离线'],
      ['LD2024005', 'T-LD-005', '华新大道终端01', '华新大道路灯表箱01', 4, '华新大道', '华新大道北段', 112.553, 26.894, 54, 14.0, 'NB-IoT', '2024-02-20', 'normal', ''],
      ['LD2024006', 'T-LD-006', '白沙洲终端01', '白沙洲路灯表箱01', 2, '白沙洲', '白沙洲工业园', 112.598, 26.856, 30, 7.8, 'PLC-4G', '2024-03-15', 'normal', ''],
    ];
    slData.forEach(d => {
      try { run(`INSERT INTO street_lights (box_code, terminal_code, terminal_name, name, district_id, road_section, location, longitude, latitude, light_count, power_load, controller_type, install_date, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, d); } catch (e) {}
    });
  }

  // 示例景观表箱
  const lbCount = get('SELECT COUNT(*) as cnt FROM landscape_boxes');
  if (lbCount.cnt === 0) {
    const lbData = [
      ['JG2024001', '湘江风光带景观箱01', 1, '湘江东路', '湘江风光带北段', 112.580, 26.902, '沿江景观', 120, 25.0, 'DMX512', '2024-01-15', 'normal', ''],
      ['JG2024002', '南湖公园景观箱01', 2, '南湖公园', '南湖公园中心', 112.560, 26.880, '公园景观', 85, 18.5, 'DMX512', '2024-02-01', 'normal', ''],
      ['JG2024003', '石鼓广场景观箱01', 3, '石鼓广场', '石鼓广场南侧', 112.575, 26.900, '广场景观', 60, 12.0, 'RDM', '2024-03-10', 'normal', ''],
      ['JG2024004', '蒸水河景观箱01', 4, '蒸水河畔', '蒸水河景观带', 112.545, 26.895, '滨河景观', 95, 20.0, 'DMX512', '2024-01-20', 'maintenance', '计划检修'],
      ['JG2024005', '万达广场景观箱01', 4, '蒸湘南路', '万达广场前', 112.562, 26.883, '商业景观', 45, 10.5, 'RDM', '2024-02-20', 'normal', ''],
    ];
    lbData.forEach(d => {
      try { run(`INSERT INTO landscape_boxes (box_code, name, district_id, road_section, location, longitude, latitude, scene_type, light_count, power_load, control_mode, install_date, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, d); } catch (e) {}
    });
  }

  // 补充更多运维记录
  const mrCount = get('SELECT COUNT(*) as cnt FROM maintenance_records');
  if (mrCount.cnt <= 7) {
    const moreRecords = [
      [1, 'component', '高压熔断器更换', '熔断器老化损坏', '更换完成，测试正常', '2024-03-20', null, 500, '赵工', 'completed'],
      [2, 'routine', '二季度例行巡检', '全面检查变压器运行状态', '各项指标正常', '2024-04-10', '2024-07-10', 0, '李工', 'completed'],
      [3, 'repair', '二次抢修处理', '散热系统故障修复', '散热恢复正常', '2024-03-05', null, 800, '王工', 'completed'],
      [6, 'routine', '一季度例行巡检', '常规检查和维护', '运行正常', '2024-01-25', '2024-04-25', 0, '张工', 'completed'],
      [10, 'routine', '一季度例行巡检', '首次运行检查', '设备运行稳定', '2024-02-01', '2024-05-01', 0, '李工', 'completed'],
    ];
    moreRecords.forEach(r => {
      try { run(`INSERT INTO maintenance_records (device_id, maintenance_type, title, description, result, maintenance_date, next_maintenance_date, cost, handler, status) VALUES (?,?,?,?,?,?,?,?,?,?)`, r); } catch (e) {}
    });
  }

  console.log('种子数据初始化完成');
}

module.exports = { getDb, run, get, all, exec, initDatabase, saveDb };
