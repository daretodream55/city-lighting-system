const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/streetlights', require('./routes/streetlights'));
app.use('/api/landscape', require('./routes/landscape'));
app.use('/api/system', require('./routes/system'));

// 导入模板下载
app.get('/api/templates/devices-import', (req, res) => {
  const XLSX = require('xlsx');
  const template = [
    { '设备编码': '', '终端编号': '', '设备名称': '', '区划': '', '路段': '', '位置': '', '经度': '', '纬度': '', '变压器型号': '', '容量(KVA)': '', '制造商': '', '供电账户号': '', '控制箱号': '', '状态': 'normal', '备注': '' }
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  // 设置列宽
  ws['!cols'] = template[0] ? Object.keys(template[0]).map(() => ({ wch: 18 })) : [];
  XLSX.utils.book_append_sheet(wb, ws, '专变设备导入模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename1 = encodeURIComponent('专变设备导入模板.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename1}`);
  res.send(buf);
});

app.get('/api/templates/streetlights-import', (req, res) => {
  const XLSX = require('xlsx');
  const template = [
    { '表箱编码': '', '名称': '', '区划': '', '路段': '', '位置': '', '经度': '', '纬度': '', '灯具数量': '', '功率负载(KW)': '', '控制器类型': '', '安装日期': '', '状态': 'normal', '备注': '' }
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  ws['!cols'] = Object.keys(template[0]).map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, '路灯表箱导入模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename2 = encodeURIComponent('路灯表箱导入模板.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename2}`);
  res.send(buf);
});

app.get('/api/templates/landscape-import', (req, res) => {
  const XLSX = require('xlsx');
  const template = [
    { '表箱编码': '', '名称': '', '区划': '', '路段': '', '位置': '', '经度': '', '纬度': '', '场景类型': '', '灯具数量': '', '功率负载(KW)': '', '控制方式': '', '安装日期': '', '状态': 'normal', '备注': '' }
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  ws['!cols'] = Object.keys(template[0]).map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, '景观表箱导入模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename3 = encodeURIComponent('景观表箱导入模板.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename3}`);
  res.send(buf);
});

// 静态文件（生产环境前端构建产物）
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send('Frontend not built yet. Run: cd frontend && npm run build');
    }
  }
});

// 异步启动
(async () => {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`城市照明专变管理系统后端已启动: http://localhost:${PORT}`);
    console.log(`API地址: http://localhost:${PORT}/api`);
  });
})();
