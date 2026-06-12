# 城市照明专变管理系统

面向衡阳市的城市照明专用变压器数字化管理平台，实现设备台账管理、地图可视化定位、运维记录追溯和自动化统计报表功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 2.7 + Element UI + ECharts + Leaflet |
| 后端 | Node.js + Express + SQLite (sql.js) |
| 认证 | JWT + bcryptjs |
| 地图 | 高德地图瓦片 |

## 快速启动

```bash
# 1. 安装后端依赖
cd backend && npm install

# 2. 安装前端依赖
cd ../frontend && npm install

# 3. 构建前端
npm run build

# 4. 启动后端（自动初始化数据库）
cd ../backend && node server.js

# 5. 访问
# http://localhost:3001
```

## 默认账号

- 用户名: `admin`
- 密码: `admin123`

## 功能模块

- **总览** - 仪表盘统计卡片 + 饼图 + 趋势图
- **专变台账管理** - 设备CRUD + Excel导入导出 + 下载模板
- **基础数据** - 路灯表箱管理 / 景观表箱管理
- **查询筛选** - 跨模块全文搜索
- **运维管理** - 例行维护 / 元器件更换 / 故障抢修 / 维护提醒
- **统计报表** - 设备统计 / 运维统计 / 故障统计 / 月度导出
- **地图可视化** - 高德地图 + 设备位置标记 + 标准/卫星切换
- **用户管理** - 用户CRUD + 角色权限
- **操作日志** - 全操作记录追溯
- **系统配置** - 维护提醒天数 / 地图参数等

## 项目结构

```
city-lighting-system/
├── backend/
│   ├── server.js          # Express入口
│   ├── database.js         # SQLite数据库初始化 + 种子数据
│   ├── auth.js             # JWT认证中间件
│   └── routes/             # API路由
│       ├── auth.js         # 登录认证
│       ├── devices.js      # 专变设备台账
│       ├── maintenance.js  # 运维记录
│       ├── streetlights.js # 路灯表箱
│       ├── landscape.js    # 景观表箱
│       └── system.js       # 系统管理
├── frontend/
│   └── src/
│       ├── views/          # 17个页面组件
│       ├── router/         # Vue Router配置
│       ├── api/            # Axios封装
│       └── assets/         # 全局CSS
└── .gitignore
```
