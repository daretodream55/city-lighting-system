<template>
  <div>
    <h2 class="page-title">例行维护检修</h2>
    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索标题/设备..." clearable style="width:220px" @clear="loadData" @keyup.enter.native="loadData" />
      <el-select v-model="search.status" placeholder="状态" clearable style="width:120px" @change="loadData">
        <el-option label="待处理" value="pending" /><el-option label="处理中" value="in_progress" /><el-option label="已完成" value="completed" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
      <div style="flex:1" />
      <el-button type="success" icon="el-icon-plus" @click="openDialog()">新增维护</el-button>
    </div>
    <div class="table-container">
      <el-table :data="list" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="50" /><el-table-column prop="device_name" label="关联设备" min-width="160" />
        <el-table-column prop="device_code" label="设备编码" width="130" /><el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="handler" label="处理人" width="90" /><el-table-column prop="maintenance_date" label="维护日期" width="110" />
        <el-table-column prop="next_maintenance_date" label="下次维护" width="110" />
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="s"><el-tag :type="s.row.status==='completed'?'success':s.row.status==='in_progress'?'':'warning'" size="small">{{ s.row.status==='completed'?'已完成':s.row.status==='in_progress'?'处理中':'待处理' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template slot-scope="s"><el-button type="text" size="small" @click="openDialog(s.row)">编辑</el-button>
            <el-popconfirm title="确认删除？" @confirm="del(s.row.id)"><el-button type="text" size="small" style="color:#f56c6c" slot="reference">删除</el-button></el-popconfirm></template>
        </el-table-column>
      </el-table>
      <div style="text-align:right;padding:12px 0"><el-pagination background layout="total,prev,pager,next" :total="total" :page-size="search.pageSize" :current-page.sync="search.page" @current-change="loadData" /></div>
    </div>
    <el-dialog :title="isEdit?'编辑':'新增'" :visible.sync="dialogVisible" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="关联设备" prop="device_id"><el-select v-model="form.device_id" filterable style="width:100%"><el-option v-for="d in devices" :key="d.id" :label="d.name+' ('+d.device_code+')'" :value="d.id" /></el-select></el-form-item>
        <el-form-item label="标题" prop="title"><el-input v-model="form.title" /></el-form-item>
        <el-row :gutter="20"><el-col :span="12"><el-form-item label="维护日期" prop="maintenance_date"><el-date-picker v-model="form.maintenance_date" type="date" style="width:100%" value-format="yyyy-MM-dd" /></el-form-item></el-col><el-col :span="12"><el-form-item label="下次维护"><el-date-picker v-model="form.next_maintenance_date" type="date" style="width:100%" value-format="yyyy-MM-dd" /></el-form-item></el-col></el-row>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="处理结果"><el-input v-model="form.result" type="textarea" :rows="2" /></el-form-item>
        <el-row :gutter="20"><el-col :span="12"><el-form-item label="处理人"><el-input v-model="form.handler" /></el-form-item></el-col><el-col :span="12"><el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option label="待处理" value="pending" /><el-option label="处理中" value="in_progress" /><el-option label="已完成" value="completed" /></el-select></el-form-item></el-col></el-row>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="1" /></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api'
export default {
  name: 'RoutineMaintenance', data() { return { list:[],total:0,loading:false,devices:[],search:{keyword:'',status:'',page:1,pageSize:20},dialogVisible:false,isEdit:false,saving:false,form:{},rules:{device_id:[{required:true}],title:[{required:true}],maintenance_date:[{required:true}]} }},
  mounted() { this.loadDevices();this.loadData() },
  methods: {
    async loadDevices(){ const r=await api.get('/devices',{params:{pageSize:999}}); this.devices=(r.list||[]).filter(d=>d.status!=='deleted') },
    async loadData(){ this.loading=true; try{const r=await api.get('/maintenance',{params:{...this.search,maintenance_type:'routine'}});this.list=r.list;this.total=r.total}catch(e){}finally{this.loading=false} },
    openDialog(row){ this.isEdit=!!row;this.form=row?{...row}:{device_id:null,title:'',description:'',result:'',maintenance_date:'',next_maintenance_date:null,handler:'',status:'pending',remark:''};this.dialogVisible=true },
    async save(){ this.$refs.formRef.validate(async v=>{if(!v)return;this.saving=true; try{const data={...this.form,maintenance_type:'routine'};if(this.isEdit)await api.put('/maintenance/'+data.id,data);else await api.post('/maintenance',data);this.$message.success(this.isEdit?'更新成功':'新增成功');this.dialogVisible=false;this.loadData()}catch(e){}finally{this.saving=false}}) },
    async del(id){ await api.delete('/maintenance/'+id);this.$message.success('删除成功');this.loadData() }
  }
}
</script>
