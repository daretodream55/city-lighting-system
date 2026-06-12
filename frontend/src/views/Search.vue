<template>
  <div>
    <h2 class="page-title">查询筛选</h2>
    <div class="search-bar" style="flex-wrap:wrap">
      <el-select v-model="search.category" placeholder="查询类别" style="width:140px" @change="loadData">
        <el-option label="全部" value="all" /><el-option label="专变设备" value="devices" />
        <el-option label="路灯表箱" value="streetlights" /><el-option label="景观表箱" value="landscape" />
      </el-select>
      <el-input v-model="search.keyword" placeholder="关键字搜索..." clearable style="width:220px" @keyup.enter.native="loadData" />
      <el-select v-model="search.district_id" placeholder="区划" clearable style="width:130px" @change="loadData">
        <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-select v-model="search.status" placeholder="状态" clearable style="width:120px" @change="loadData">
        <el-option label="正常" value="normal" /><el-option label="故障中" value="fault" />
        <el-option label="待维护" value="maintenance" /><el-option label="待抢修" value="repair" />
        <el-option label="已报废" value="scrapped" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">全文搜索</el-button>
      <el-button icon="el-icon-refresh" @click="loadData">刷新</el-button>
      <span style="color:#999;margin-left:auto">共找到 <b style="color:#1a237e">{{ total }}</b> 条记录</span>
    </div>
    <div class="table-container">
      <el-table :data="list" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="50" />
        <el-table-column label="类型" width="90">
          <template slot-scope="s"><el-tag :type="s.row._type==='device'?'':'info'" size="small">{{ typeMap[s.row._type] }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="_code" label="编码" width="130" />
        <el-table-column prop="name" label="名称" min-width="180" /><el-table-column prop="district_name" label="区划" width="90" />
        <el-table-column prop="road_section" label="路段" width="130" /><el-table-column prop="location" label="位置" min-width="180" />
        <el-table-column prop="status" label="状态" width="80">
          <template slot-scope="s"><el-tag :type="statusType(s.row.status)" size="small">{{ statusMap[s.row.status]||s.row.status }}</el-tag></template>
        </el-table-column>
      </el-table>
      <div style="text-align:right;padding:12px 0"><el-pagination background layout="total,prev,pager,next" :total="total" :page-size="search.pageSize" :current-page.sync="search.page" @current-change="loadData" /></div>
    </div>
  </div>
</template>

<script>
import api from '../api'
export default {
  name: 'Search', data() { return { list:[],total:0,loading:false,districts:[],search:{category:'all',keyword:'',district_id:'',status:'',page:1,pageSize:20},typeMap:{device:'专变设备',streetlight:'路灯表箱',landscape:'景观表箱'},statusMap:{normal:'正常',fault:'故障中',maintenance:'待维护',repair:'待抢修',scrapped:'已报废'} }},
  mounted() { this.loadDistricts(); this.loadData() },
  methods: {
    async loadDistricts(){ const r=await api.get('/system/districts'); this.districts=r||[] },
    async loadData(){ this.loading=true; try{
      let results=[]
      const {category,keyword,district_id,status}=this.search
      const params={keyword,district_id,status}
      if(category==='all'||category==='devices'){
        const d=await api.get('/devices',{params:{...params,pageSize:999}})
        results.push(...(d.list||[]).filter(i=>i.status!=='deleted').map(i=>({...i,_type:'device',_code:i.device_code})))
      }
      if(category==='all'||category==='streetlights'){
        const d=await api.get('/streetlights',{params:{...params,pageSize:999}})
        results.push(...(d.list||[]).map(i=>({...i,_type:'streetlight',_code:i.box_code})))
      }
      if(category==='all'||category==='landscape'){
        const d=await api.get('/landscape',{params:{...params,pageSize:999}})
        results.push(...(d.list||[]).map(i=>({...i,_type:'landscape',_code:i.box_code})))
      }
      this.total=results.length
      const start=((this.search.page-1)*this.search.pageSize)
      this.list=results.slice(start,start+this.search.pageSize)
    }catch(e){}finally{this.loading=false} },
    statusType(s){ return {normal:'success',fault:'danger',maintenance:'warning',repair:'danger',scrapped:'info'}[s]||'info' }
  }
}
</script>
