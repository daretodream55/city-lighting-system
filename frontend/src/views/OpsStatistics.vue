<template>
  <div><h2 class="page-title">运维统计</h2>
    <div class="chart-row">
      <div class="chart-card"><h3>运维类型分布</h3><div ref="typeChart" style="height:300px"></div></div>
      <div class="chart-card"><h3>月度运维趋势</h3><div ref="monthlyChart" style="height:300px"></div></div>
    </div>
    <div class="chart-row">
      <div class="chart-card"><h3>处理人工作量统计</h3><div ref="handlerChart" style="height:280px"></div></div>
      <div class="chart-card" style="flex:1"><h3>运维明细列表</h3>
        <el-table :data="records" size="small" style="width:100%" max-height="250">
          <el-table-column prop="title" label="标题" min-width="160" /><el-table-column prop="handler" label="处理人" width="80" />
          <el-table-column prop="maintenance_date" label="日期" width="100" /><el-table-column prop="status" label="状态" width="80">
            <template slot-scope="s"><el-tag :type="s.row.status==='completed'?'success':'warning'" size="small">{{ s.row.status==='completed'?'已完成':'待处理' }}</el-tag></template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api'; import * as echarts from 'echarts'
export default {
  name:'OpsStatistics', data(){ return { records:[] } },
  async mounted(){
    const [typeRes,monthlyRes,recordsRes]=await Promise.all([api.get('/maintenance/stats/type'),api.get('/system/stats/monthly'),api.get('/maintenance',{params:{pageSize:999}})])
    this.records=recordsRes.list||[]
    this.$nextTick(()=>{
      const c1=echarts.init(this.$refs.typeChart)
      c1.setOption({tooltip:{trigger:'item'},series:[{type:'pie',radius:['40%','70%'],data:typeRes.map(d=>({name:d.name,value:d.count}))}]})
      const months=[...new Set(monthlyRes.map(d=>d.month))].sort(); const types=[...new Set(monthlyRes.map(d=>d.maintenance_type))]; const tm={routine:'例行维护',repair:'故障抢修',inspection:'季度巡检',component:'元器件更换'}
      const c2=echarts.init(this.$refs.monthlyChart)
      c2.setOption({tooltip:{trigger:'axis'},legend:{bottom:0,data:types.map(t=>tm[t]||t)},grid:{left:50,right:20,top:10,bottom:40},xAxis:{type:'category',data:months},yAxis:{type:'value',name:'次'},series:types.map(t=>({name:tm[t]||t,type:'line',smooth:true,data:months.map(m=>{const i=monthlyRes.find(d=>d.month===m&&d.maintenance_type===t);return i?i.count:0})}))})
      const handlerCount={};this.records.forEach(r=>{if(r.handler)handlerCount[r.handler]=(handlerCount[r.handler]||0)+1})
      const c3=echarts.init(this.$refs.handlerChart)
      c3.setOption({tooltip:{trigger:'axis'},grid:{left:80,right:20,top:10,bottom:40},xAxis:{type:'category',data:Object.keys(handlerCount)},yAxis:{type:'value',name:'次'},series:[{type:'bar',data:Object.values(handlerCount),itemStyle:{color:'#a18cd1',borderRadius:[6,6,0,0]}}]})
    })
  }
}
</script>
