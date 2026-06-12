<template>
  <div>
    <h2 class="page-title">工作台</h2>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#667eea,#764ba2)">
          <i class="el-icon-cpu"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ dashboard.totalDevices }}</div>
          <div class="stat-label">设备总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#43e97b,#38f9d7)">
          <i class="el-icon-circle-check"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ dashboard.normalDevices }}</div>
          <div class="stat-label">正常运行</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#f093fb,#f5576c)">
          <i class="el-icon-warning"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ dashboard.faultDevices }}</div>
          <div class="stat-label">故障设备</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#fa709a,#fee140)">
          <i class="el-icon-s-tools"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ dashboard.pendingMaintenance }}</div>
          <div class="stat-label">待处理运维</div>
        </div>
      </div>
    </div>

    <!-- 图表行 -->
    <div class="chart-row">
      <div class="chart-card">
        <h3>设备状态分布</h3>
        <div ref="deviceChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <h3>区划设备统计</h3>
        <div ref="districtChart" style="height:300px"></div>
      </div>
    </div>

    <!-- 待维护提醒 -->
    <div class="chart-card" style="margin-bottom:0">
      <h3>待维护提醒（近期待处理）</h3>
      <el-table :data="reminders" style="width:100%" size="small">
        <el-table-column prop="device_name" label="设备名称" min-width="160" />
        <el-table-column prop="device_code" label="设备编码" width="140" />
        <el-table-column prop="title" label="维护标题" min-width="160" />
        <el-table-column prop="maintenance_type" label="类型" width="100">
          <template slot-scope="scope">{{ typeMap[scope.row.maintenance_type] }}</template>
        </el-table-column>
        <el-table-column prop="next_maintenance_date" label="下次维护" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="statusType(scope.row.status)" size="small">{{ statusMap[scope.row.status] }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import api from '../api'
import * as echarts from 'echarts'

export default {
  name: 'Dashboard',
  data() {
    return {
      dashboard: { totalDevices: 0, normalDevices: 0, faultDevices: 0, pendingMaintenance: 0 },
      reminders: [],
      typeMap: { routine: '例行维护', repair: '故障抢修', inspection: '季度巡检', annual: '年度检修', preventive: '预防性试验', component: '元器件更换' },
      statusMap: { pending: '待处理', in_progress: '处理中', completed: '已完成' }
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const [dashRes, deviceStats, districtStats, remindersRes] = await Promise.all([
          api.get('/system/dashboard'),
          api.get('/system/stats/devices'),
          api.get('/system/stats/district'),
          api.get('/maintenance/reminders/pending')
        ])
        this.dashboard = dashRes
        this.reminders = remindersRes || []
        this.$nextTick(() => {
          this.renderDeviceChart(deviceStats)
          this.renderDistrictChart(districtStats)
        })
      } catch (e) {}
    },
    renderDeviceChart(data) {
      const chart = echarts.init(this.$refs.deviceChart)
      chart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
          data: data.map(d => ({ name: d.name, value: d.count })),
          label: { formatter: '{b}: {c}台' },
          itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }
        }],
        color: ['#67c23a', '#f56c6c', '#e6a23c', '#f093fb', '#909399']
      })
      window.addEventListener('resize', () => chart.resize())
    },
    renderDistrictChart(data) {
      const chart = echarts.init(this.$refs.districtChart)
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { rotate: 30 } },
        yAxis: { type: 'value', name: '设备数' },
        series: [{
          type: 'bar', data: data.map(d => d.count),
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' }, { offset: 1, color: '#764ba2' }
          ]), borderRadius: [6,6,0,0] }
        }],
        grid: { left: 50, right: 20, top: 20, bottom: 60 }
      })
      window.addEventListener('resize', () => chart.resize())
    },
    statusType(s) {
      return { pending: 'warning', in_progress: '', completed: 'success' }[s] || 'info'
    }
  }
}
</script>
