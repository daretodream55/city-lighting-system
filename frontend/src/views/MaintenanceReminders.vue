<template>
  <div><h2 class="page-title">维护提醒</h2>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#f56c6c,#e6a23c)"><i class="el-icon-bell"></i></div><div class="stat-info"><div class="stat-value">{{ reminders.length }}</div><div class="stat-label">待处理提醒</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#e6a23c,#f56c6c)"><i class="el-icon-warning"></i></div><div class="stat-info"><div class="stat-value">{{ overdue.length }}</div><div class="stat-label">已逾期</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#67c23a,#85ce61)"><i class="el-icon-date"></i></div><div class="stat-info"><div class="stat-value">{{ remindDays }}</div><div class="stat-label">提醒天数</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#409eff,#66b1ff)"><i class="el-icon-s-order"></i></div><div class="stat-info"><div class="stat-value">{{ upcoming.length }}</div><div class="stat-label">即将到期</div></div></div>
    </div>
    <div class="table-container">
      <el-table :data="reminders" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="50" />
        <el-table-column prop="device_name" label="设备名称" min-width="160" /><el-table-column prop="device_code" label="设备编码" width="130" />
        <el-table-column prop="title" label="维护标题" min-width="180" />
        <el-table-column prop="next_maintenance_date" label="计划维护日" width="120">
          <template slot-scope="s"><span :style="{color: isOverdue(s.row.next_maintenance_date)?'#f56c6c':'#333',fontWeight:'bold'}">{{ s.row.next_maintenance_date }}</span></template>
        </el-table-column>
        <el-table-column label="到期状态" width="100">
          <template slot-scope="s"><el-tag :type="isOverdue(s.row.next_maintenance_date)?'danger':'warning'" size="small">{{ isOverdue(s.row.next_maintenance_date)?'已逾期':'即将到期' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="handler" label="维护人" width="90" /><el-table-column prop="status" label="状态" width="90">
          <template slot-scope="s"><el-tag :type="s.row.status==='completed'?'success':'warning'" size="small">{{ s.row.status==='completed'?'已完成':'待处理' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="100"><template slot-scope="s"><el-button type="primary" size="small" @click="goToMaintenance(s.row)">处理</el-button></template></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import api from '../api'
export default {
  name:'MaintenanceReminders', data(){ return { reminders:[],loading:false,remindDays:7 } },
  computed:{
    overdue(){ return this.reminders.filter(r=>this.isOverdue(r.next_maintenance_date)) },
    upcoming(){ return this.reminders.filter(r=>!this.isOverdue(r.next_maintenance_date)) }
  },
  async mounted(){
    try{
      const [remindersRes, configRes]=await Promise.all([api.get('/maintenance/reminders/pending'),api.get('/system/config')]);
      this.reminders=remindersRes||[];
      const cfg=(configRes||[]).find(c=>c.config_key==='maintenance_remind_days');
      if(cfg)this.remindDays=parseInt(cfg.config_value)
    }catch(e){}
  },
  methods:{
    isOverdue(date){ if(!date)return false; return new Date(date)<new Date(new Date().toISOString().split('T')[0]) },
    goToMaintenance(row){ this.$router.push('/maintenance/routine') }
  }
}
</script>
