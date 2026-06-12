import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const router = new Router({
  mode: 'hash',
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { noAuth: true }
    },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      redirect: '/overview',
      children: [
        { path: 'overview', name: 'Overview', component: () => import('../views/Overview.vue'), meta: { title: '总览' } },
        { path: 'devices', name: 'Devices', component: () => import('../views/Devices.vue'), meta: { title: '专变台账管理' } },
        { path: 'streetlights', name: 'StreetLights', component: () => import('../views/StreetLights.vue'), meta: { title: '路灯表箱管理' } },
        { path: 'landscape', name: 'Landscape', component: () => import('../views/Landscape.vue'), meta: { title: '景观表箱管理' } },
        { path: 'search', name: 'Search', component: () => import('../views/Search.vue'), meta: { title: '查询筛选' } },
        { path: 'maintenance/routine', name: 'RoutineMaintenance', component: () => import('../views/RoutineMaintenance.vue'), meta: { title: '例行维护检修' } },
        { path: 'maintenance/component', name: 'ComponentReplacement', component: () => import('../views/ComponentReplacement.vue'), meta: { title: '元器件更换' } },
        { path: 'maintenance/repair', name: 'FaultRepair', component: () => import('../views/FaultRepair.vue'), meta: { title: '故障抢修' } },
        { path: 'maintenance/reminders', name: 'MaintenanceReminders', component: () => import('../views/MaintenanceReminders.vue'), meta: { title: '维护提醒' } },
        { path: 'reports/devices', name: 'DeviceStatistics', component: () => import('../views/DeviceStatistics.vue'), meta: { title: '设备统计' } },
        { path: 'reports/ops', name: 'OpsStatistics', component: () => import('../views/OpsStatistics.vue'), meta: { title: '运维统计' } },
        { path: 'reports/faults', name: 'FaultStatistics', component: () => import('../views/FaultStatistics.vue'), meta: { title: '故障统计' } },
        { path: 'reports/export', name: 'MonthlyExport', component: () => import('../views/MonthlyExport.vue'), meta: { title: '月度导出' } },
        { path: 'map', name: 'Map', component: () => import('../views/MapView.vue'), meta: { title: '地图可视化' } },
        { path: 'users', name: 'Users', component: () => import('../views/Users.vue'), meta: { title: '用户管理', admin: true } },
        { path: 'logs', name: 'Logs', component: () => import('../views/Logs.vue'), meta: { title: '操作日志' } },
        { path: 'config', name: 'Config', component: () => import('../views/Config.vue'), meta: { title: '系统配置', admin: true } },
      ]
    },
    { path: '*', redirect: '/login' }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.meta.noAuth) {
    next()
  } else {
    const token = localStorage.getItem('token')
    if (token) {
      next()
    } else {
      next('/login')
    }
  }
})

export default router
