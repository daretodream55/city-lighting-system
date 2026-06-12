<template>
  <div><h2 class="page-title">故障统计</h2>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#f56c6c,#ff7875)"><i class="el-icon-warning"></i></div><div class="stat-info"><div class="stat-value">{{ faultStats.total }}</div><div class="stat-label">故障总数</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#67c23a,#85ce61)"><i class="el-icon-circle-check"></i></div><div class="stat-info"><div class="stat-value">{{ faultStats.resolved }}</div><div class="stat-label">已修复</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#e6a23c,#f7ba2a)"><i class="el-icon-loading"></i></div><div class="stat-info"><div class="stat-value">{{ faultStats.unresolved }}</div><div class="stat-label">待处理</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#909399,#b4b4b8)"><i class="el-icon-time"></i></div><div class="stat-info"><div class="stat-value">{{ faultStats.avgResolveTime || '-' }}</div><div class="stat-label">平均修复时间(天)</div></div></div>
    </div>
    <div class="chart-row">
      <div class="chart-card"><h3>月度故障趋势</h3><div ref="faultTrend" style="height:320px"></div></div>
      <div class="chart-card"><h3>故障设备排行</h3><div ref="faultRank" style="height:320px"></div></div>
    </div>
  </div>
</template>

<script>
import api from '../api'; import * as echarts from 'echarts'
export default {
  name:'FaultStatistics', data(){ return { faultStats:{total:0,resolved:0,unresolved:0,avgResolveTime:''} } },
  async mounted(){
    try{
      const recordsRes=await api.get('/maintenance',{params:{maintenance_type:'repair',pageSize:999}})
      const records=recordsRes.list||[]
      this.faultStats.total=records.length
      this.faultStats.resolved=records.filter(r=>r.status==='completed').length
      this.faultStats.unresolved=records.filter(r=>r.status!=='completed').length
      const monthlyCount={}; records.forEach(r=>{ const m=r.maintenance_date?r.maintenance_date.substring(0,7):''; if(m)monthlyCount[m]=(monthlyCount[m]||0)+1 })
      const devCount={}; records.forEach(r=>{ const n=r.device_name; if(n)devCount[n]=(devCount[n]||0)+1 })
      this.$nextTick(()=>{
        const c1=echarts.init(this.$refs.faultTrend)
        c1.setOption({tooltip:{trigger:'axis'},grid:{left:50,right:20,top:10,bottom:40},xAxis:{type:'category',data:Object.keys(monthlyCount).sort()},yAxis:{type:'value',name:'次数'},series:[{type:'line',data:Object.values(monthlyCount),smooth:true,itemStyle:{color:'#f56c6c'},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(245,108,108,0.3)'},{offset:1,color:'rgba(245,108,108,0)'}])}}]})
        const c2=echarts.init(this.$refs.faultRank)
        const sorted=Object.entries(devCount).sort((a,b)=>b[1]-a[1]).slice(0,10)
        c2.setOption({tooltip:{trigger:'axis'},grid:{left:130,right:20,top:10,bottom:20},xAxis:{type:'value',name:'次数'},yAxis:{type:'category',data:sorted.map(s=>s[0]),inverse:true,axisLabel:{width:120,overflow:'truncate'}},series:[{type:'bar',data:sorted.map(s=>s[1]),itemStyle:{color:'#f56c6c',borderRadius:[0,4,4,0]}}]})
      })
    }catch(e){}
  }
}
</script>
