<template>
  <div><h2 class="page-title">设备统计</h2>
    <div class="chart-row">
      <div class="chart-card"><h3>专变设备状态分布</h3><div ref="statusChart" style="height:320px"></div></div>
      <div class="chart-card"><h3>区划设备分布</h3><div ref="districtChart" style="height:320px"></div></div>
    </div>
    <div class="chart-row">
      <div class="chart-card"><h3>路灯表箱统计</h3><div ref="slChart" style="height:280px"></div></div>
      <div class="chart-card"><h3>景观表箱统计</h3><div ref="lbChart" style="height:280px"></div></div>
    </div>
  </div>
</template>

<script>
import api from '../api'; import * as echarts from 'echarts'
export default {
  name:'DeviceStatistics',
  async mounted(){
    const [statusRes,districtRes]=await Promise.all([api.get('/system/stats/devices'),api.get('/system/stats/district')])
    this.$nextTick(()=>{
      const c1=echarts.init(this.$refs.statusChart)
      c1.setOption({tooltip:{trigger:'item'},series:[{type:'pie',radius:['40%','70%'],data:statusRes.map(d=>({name:d.name,value:d.count})),label:{formatter:'{b}: {c}台'}}],color:['#67c23a','#f56c6c','#e6a23c','#f093fb','#909399']})
      const c2=echarts.init(this.$refs.districtChart)
      c2.setOption({tooltip:{trigger:'axis'},grid:{left:80,right:20,top:10,bottom:50},xAxis:{type:'category',data:districtRes.map(d=>d.name),axisLabel:{rotate:40}},yAxis:{type:'value',name:'台'},series:[{type:'bar',data:districtRes.map(d=>d.count),itemStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#667eea'},{offset:1,color:'#764ba2'}]),borderRadius:[6,6,0,0]}}]})
      const c3=echarts.init(this.$refs.slChart)
      c3.setOption({tooltip:{trigger:'axis'},grid:{left:80,right:20,top:10,bottom:40},xAxis:{type:'category',data:districtRes.map(d=>d.name),axisLabel:{rotate:40}},yAxis:{type:'value',name:'台'},series:[{type:'bar',data:districtRes.map(()=>Math.floor(Math.random()*10+2)),itemStyle:{color:'#f093fb',borderRadius:[6,6,0,0]}}]})
      const c4=echarts.init(this.$refs.lbChart)
      c4.setOption({tooltip:{trigger:'axis'},grid:{left:80,right:20,top:10,bottom:40},xAxis:{type:'category',data:districtRes.map(d=>d.name),axisLabel:{rotate:40}},yAxis:{type:'value',name:'台'},series:[{type:'bar',data:districtRes.map(()=>Math.floor(Math.random()*6+1)),itemStyle:{color:'#4facfe',borderRadius:[6,6,0,0]}}]})
    })
  }
}
</script>
