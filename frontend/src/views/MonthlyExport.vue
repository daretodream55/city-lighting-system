<template>
  <div><h2 class="page-title">月度导出</h2>
    <div class="search-bar">
      <span style="font-weight:bold">选择导出月份:</span>
      <el-date-picker v-model="exportMonth" type="month" placeholder="选择月份" value-format="yyyy-MM" />
      <el-button type="primary" icon="el-icon-download" @click="exportData">导出月度报表</el-button>
      <el-button icon="el-icon-printer" @click="printReport">打印报表</el-button>
    </div>
    <div v-if="exportMonth" class="table-container" style="padding:20px" id="printArea">
      <h3 style="text-align:center;margin-bottom:20px">{{ exportMonth }} 城市照明专变运维月报表</h3>
      <h4 style="margin-bottom:10px;color:#1a237e">一、设备概况</h4>
      <el-table :data="[summary]" border size="small" style="margin-bottom:20px">
        <el-table-column prop="totalDevices" label="设备总数" width="100" /><el-table-column prop="normalDevices" label="正常运行" width="100" />
        <el-table-column prop="faultDevices" label="故障设备" width="100" /><el-table-column prop="onlineRate" label="正常运行率" width="110" />
        <el-table-column prop="totalMaintenance" label="当月运维次数" width="120" /><el-table-column prop="totalCost" label="当月维护费用(元)" width="130" />
      </el-table>
      <h4 style="margin-bottom:10px;color:#1a237e">二、运维记录</h4>
      <el-table :data="monthlyRecords" border size="small" style="margin-bottom:20px">
        <el-table-column type="index" width="50" /><el-table-column prop="device_name" label="设备" width="140" />
        <el-table-column prop="title" label="标题" min-width="160" /><el-table-column prop="maintenance_type" label="类型" width="100">
          <template slot-scope="s">{{ typeMap[s.row.maintenance_type] }}</template>
        </el-table-column>
        <el-table-column prop="maintenance_date" label="日期" width="100" /><el-table-column prop="handler" label="处理人" width="80" />
        <el-table-column prop="cost" label="费用(元)" width="90" align="right" /><el-table-column prop="status" label="状态" width="80">
          <template slot-scope="s"><el-tag :type="s.row.status==='completed'?'success':'warning'" size="small">{{ s.row.status==='completed'?'已完成':'待处理' }}</el-tag></template>
        </el-table-column>
      </el-table>
      <h4 style="margin-bottom:10px;color:#1a237e">三、故障分析</h4>
      <el-table :data="faultRecords" border size="small">
        <el-table-column type="index" width="50" /><el-table-column prop="device_name" label="故障设备" width="140" />
        <el-table-column prop="title" label="故障标题" min-width="160" /><el-table-column prop="description" label="故障描述" min-width="180" />
        <el-table-column prop="result" label="处理结果" min-width="150" /><el-table-column prop="handler" label="抢修人" width="80" />
        <el-table-column prop="maintenance_date" label="日期" width="100" />
      </el-table>
    </div>
  </div>
</template>

<script>
import api from '../api'
export default {
  name:'MonthlyExport', data(){ return { exportMonth:new Date().toISOString().substring(0,7),summary:{},monthlyRecords:[],faultRecords:[],typeMap:{routine:'例行维护',repair:'故障抢修',inspection:'季度巡检',component:'元器件更换'} } },
  methods:{
    async exportData(){
      if(!this.exportMonth)return this.$message.warning('请选择月份')
      const [dashRes,recordsRes]=await Promise.all([api.get('/system/dashboard'),api.get('/maintenance',{params:{pageSize:999}})])
      const all=(recordsRes.list||[]).filter(r=>r.maintenance_date&&r.maintenance_date.startsWith(this.exportMonth))
      this.monthlyRecords=all.filter(r=>r.maintenance_type!=='repair')
      this.faultRecords=all.filter(r=>r.maintenance_type==='repair')
      const totalCost=all.reduce((s,r)=>s+(r.cost||0),0)
      this.summary={...dashRes,totalMaintenance:all.length,totalCost:totalCost.toFixed(2)}
      this.$message.success('数据已加载')
    },
    printReport(){ window.print() }
  }
}
</script>
