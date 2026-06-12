<template>
  <div>
    <h2 class="page-title">统计报表</h2>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#667eea,#764ba2)"><i class="el-icon-cpu"></i></div>
        <div class="stat-info"><div class="stat-value">{{ dashboard.totalDevices }}</div><div class="stat-label">设备总数</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#43e97b,#38f9d7)"><i class="el-icon-circle-check"></i></div>
        <div class="stat-info"><div class="stat-value">{{ dashboard.onlineRate }}%</div><div class="stat-label">正常运行率</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#f093fb,#f5576c)"><i class="el-icon-warning"></i></div>
        <div class="stat-info"><div class="stat-value">{{ dashboard.faultDevices }}</div><div class="stat-label">故障设备</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#fa709a,#fee140)"><i class="el-icon-s-tools"></i></div>
        <div class="stat-info"><div class="stat-value">{{ dashboard.pendingMaintenance }}</div><div class="stat-label">待处理运维</div></div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="chart-row">
      <div class="chart-card">
        <h3>设备状态分布</h3>
        <div ref="statusChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <h3>区划设备分布统计</h3>
        <div ref="districtChart" style="height:300px"></div>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card">
        <h3>运维类型统计</h3>
        <div ref="typeChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <h3>月度运维趋势</h3>
        <div ref="monthlyChart" style="height:300px"></div>
      </div>
    </div>

    <!-- 导出按钮 -->
    <div style="text-align:center;margin-top:20px">
      <el-button type="primary" icon="el-icon-download" @click="exportReport">导出统计报表</el-button>
    </div>
  </div>
</template>

<script>
import api from '../api'
import * as echarts from 'echarts'

export default {
  name: 'Reports',
  data() {
    return { dashboard: { totalDevices: 0, normalDevices: 0, faultDevices: 0, pendingMaintenance: 0, onlineRate: 0 } }
  },
  mounted() { this.loadData() },
  methods: {
    async loadData() {
      try {
        const [dashRes, statusRes, districtRes, typeRes, monthlyRes] = await Promise.all([
          api.get('/system/dashboard'),
          api.get('/system/stats/devices'),
          api.get('/system/stats/district'),
          api.get('/maintenance/stats/type'),
          api.get('/system/stats/monthly')
        ])
        this.dashboard = dashRes
        this.$nextTick(() => {
          this.renderStatusChart(statusRes)
          this.renderDistrictChart(districtRes)
          this.renderTypeChart(typeRes)
          this.renderMonthlyChart(monthlyRes)
        })
      } catch (e) {}
    },
    renderStatusChart(data) {
      const chart = echarts.init(this.$refs.statusChart)
      chart.setOption({
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: ['45%','75%'], center: ['50%','50%'],
          data: data.map(d => ({ name: d.name, value: d.count })),
          label: { formatter: '{b}: {c}台' }
        }],
        color: ['#67c23a','#f56c6c','#e6a23c','#f093fb','#909399']
      })
      window.addEventListener('resize', () => chart.resize())
    },
    renderDistrictChart(data) {
      const chart = echarts.init(this.$refs.districtChart)
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 80, right: 20, top: 10, bottom: 50 },
        xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { rotate: 40 } },
        yAxis: { type: 'value', name: '台' },
        series: [{ type: 'bar', data: data.map(d => d.count),
          itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[
            { offset:0, color:'#667eea' },{ offset:1, color:'#764ba2' }
          ]), borderRadius: [6,6,0,0] }
        }]
      })
      window.addEventListener('resize', () => chart.resize())
    },
    renderTypeChart(data) {
      const chart = echarts.init(this.$refs.typeChart)
      chart.setOption({
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: ['40%','70%'], center: ['50%','50%'],
          data: data.map(d => ({ name: d.name, value: d.count }))
        }]
      })
      window.addEventListener('resize', () => chart.resize())
    },
    renderMonthlyChart(data) {
      const chart = echarts.init(this.$refs.monthlyChart)
      const months = [...new Set(data.map(d => d.month))].sort()
      const types = [...new Set(data.map(d => d.maintenance_type))]
      const typeMap = { routine: '例行维护', repair: '故障抢修', inspection: '季度巡检', component: '元器件更换' }

      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0, data: types.map(t => typeMap[t] || t) },
        grid: { left: 50, right: 20, top: 10, bottom: 40 },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value', name: '次数' },
        series: types.map(t => ({
          name: typeMap[t] || t, type: 'line',
          data: months.map(m => {
            const item = data.find(d => d.month === m && d.maintenance_type === t)
            return item ? item.count : 0
          }),
          smooth: true
        }))
      })
      window.addEventListener('resize', () => chart.resize())
    },
    exportReport() {
      this.$message.info('报表导出功能 - 可通过设备管理页面的导出功能导出详细数据')
    }
  }
}
</script>
