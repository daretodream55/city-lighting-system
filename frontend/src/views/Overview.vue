<template>
  <div>
    <h2 class="page-title">总览（概览）</h2>

    <div class="stats-row">
      <div class="stat-card" v-for="card in cards" :key="card.label">
        <div class="stat-icon" :style="{background:card.bg}"><i :class="card.icon"></i></div>
        <div class="stat-info">
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
        </div>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card"><h3>设备状态分布</h3><div ref="deviceChart" style="height:280px"></div></div>
      <div class="chart-card"><h3>运维趋势</h3><div ref="trendChart" style="height:280px"></div></div>
    </div>
    <div class="chart-row">
      <div class="chart-card" style="flex:2">
        <h3>最近运维记录</h3>
        <el-table :data="recentRecords" size="small" style="width:100%">
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column prop="device_name" label="关联设备" min-width="140" />
          <el-table-column prop="maintenance_type" label="类型" width="100">
            <template slot-scope="s">{{ typeMap[s.row.maintenance_type] }}</template>
          </el-table-column>
          <el-table-column prop="maintenance_date" label="日期" width="110" />
          <el-table-column prop="status" label="状态" width="90">
            <template slot-scope="s">
              <el-tag :type="statusType(s.row.status)" size="small">{{ s.row.status === 'completed' ? '已完成' : s.row.status === 'in_progress' ? '处理中' : '待处理' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="chart-card">
        <h3>待维护提醒</h3>
        <div style="max-height:240px;overflow-y:auto">
          <div v-for="r in reminders" :key="r.id" style="padding:8px 0;border-bottom:1px solid #eee">
            <div style="font-weight:bold;font-size:13px">{{ r.title }}</div>
            <div style="color:#999;font-size:12px">{{ r.device_name }} | {{ r.next_maintenance_date }}</div>
          </div>
          <div v-if="!reminders.length" style="color:#999;text-align:center;padding:20px">暂无待维护提醒</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api'
import * as echarts from 'echarts'

export default {
  name: 'Overview',
  data() {
    return {
      cards: [],
      recentRecords: [], reminders: [],
      typeMap: { routine: '例行维护', repair: '故障抢修', inspection: '季度巡检', component: '元器件更换' }
    }
  },
  mounted() { this.loadData() },
  methods: {
    async loadData() {
      try {
        const [dash, statusRes, monthlyRes, recentRes, remindersRes] = await Promise.all([
          api.get('/system/dashboard'),
          api.get('/system/stats/devices'),
          api.get('/system/stats/monthly'),
          api.get('/maintenance', { params: { pageSize: 10 } }),
          api.get('/maintenance/reminders/pending')
        ])
        this.cards = [
          { label: '专变设备总数', value: dash.totalDevices, icon: 'el-icon-cpu', bg: 'linear-gradient(135deg,#667eea,#764ba2)' },
          { label: '路灯表箱', value: dash.streetLightCount || 0, icon: 'el-icon-sunny', bg: 'linear-gradient(135deg,#f093fb,#f5576c)' },
          { label: '景观表箱', value: dash.landscapeCount || 0, icon: 'el-icon-star-on', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
          { label: '正常运行率', value: dash.onlineRate + '%', icon: 'el-icon-circle-check', bg: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
          { label: '故障设备', value: dash.faultDevices, icon: 'el-icon-warning', bg: 'linear-gradient(135deg,#fa709a,#fee140)' },
          { label: '待处理运维', value: dash.pendingMaintenance, icon: 'el-icon-s-tools', bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' }
        ]
        this.recentRecords = recentRes.list || []
        this.reminders = remindersRes || []
        this.$nextTick(() => {
          this.renderDeviceChart(statusRes)
          this.renderTrendChart(monthlyRes)
        })
      } catch (e) {}
    },
    renderDeviceChart(data) {
      const c = echarts.init(this.$refs.deviceChart)
      c.setOption({
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: ['40%','70%'], data: data.map(d=>({name:d.name,value:d.count})), label: { formatter: '{b}: {c}' } }],
        color: ['#67c23a','#f56c6c','#e6a23c','#f093fb','#909399']
      })
    },
    renderTrendChart(data) {
      const months = [...new Set(data.map(d=>d.month))].sort()
      const types = [...new Set(data.map(d=>d.maintenance_type))]
      const typeMap = { routine:'例行维护',repair:'故障抢修',inspection:'季度巡检',component:'元器件更换' }
      const c = echarts.init(this.$refs.trendChart)
      c.setOption({
        tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: types.map(t=>typeMap[t]||t) },
        grid: { left:50,right:20,top:10,bottom:40 },
        xAxis: { type:'category', data: months },
        yAxis: { type:'value' },
        series: types.map(t=>({ name:typeMap[t]||t, type:'line', smooth:true, data: months.map(m=>{ const i=data.find(d=>d.month===m&&d.maintenance_type===t); return i?i.count:0 }) }))
      })
    },
    statusType(s) { return { pending:'warning',in_progress:'',completed:'success' }[s]||'info' }
  }
}
</script>
