<template>
  <div>
    <h2 class="page-title">路灯表箱管理</h2>
    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索名称/编码..." clearable style="width:200px" @clear="loadData" @keyup.enter.native="loadData" />
      <el-select v-model="search.district_id" placeholder="区划" clearable style="width:130px" @change="loadData">
        <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-select v-model="search.status" placeholder="状态" clearable style="width:120px" @change="loadData">
        <el-option label="正常" value="normal" /><el-option label="故障" value="fault" /><el-option label="待维护" value="maintenance" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
      <div style="flex:1" />
      <el-button type="success" icon="el-icon-plus" @click="openDialog()">新增</el-button>
      <a :href="templateUrl" download style="text-decoration:none"><el-button icon="el-icon-download">下载导入模板</el-button></a>
      <el-upload :show-file-list="false" :before-upload="handleImport" accept=".xlsx,.xls" action="">
        <el-button icon="el-icon-upload2">导入</el-button>
      </el-upload>
    </div>

    <div class="table-container">
      <el-table :data="list" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="50" /><el-table-column prop="box_code" label="表箱编码" width="130" />
        <el-table-column prop="terminal_code" label="终端编号" width="120" /><el-table-column prop="terminal_name" label="终端名称" width="120" />
        <el-table-column prop="name" label="名称" min-width="150" /><el-table-column prop="district_name" label="区划" width="90" />
        <el-table-column prop="road_section" label="路段" width="120" /><el-table-column prop="light_count" label="灯具数量" width="90" align="right" />
        <el-table-column prop="power_load" label="功率(KW)" width="90" align="right" />
        <el-table-column prop="controller_type" label="控制器" width="100" />
        <el-table-column prop="status" label="状态" width="80">
          <template slot-scope="s"><el-tag :type="statusType(s.row.status)" size="small">{{ s.row.status==='normal'?'正常':s.row.status==='fault'?'故障':'待维护' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template slot-scope="s">
            <el-button type="text" size="small" @click="openDialog(s.row)">编辑</el-button>
            <el-popconfirm title="确认删除？" @confirm="del(s.row.id)"><el-button type="text" size="small" style="color:#f56c6c" slot="reference">删除</el-button></el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div style="text-align:right;padding:12px 0">
        <el-pagination background layout="total,prev,pager,next" :total="total" :page-size="search.pageSize" :current-page.sync="search.page" @current-change="loadData" />
      </div>
    </div>

    <el-dialog :title="isEdit?'编辑':'新增'" :visible.sync="dialogVisible" width="650px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="表箱编码" prop="box_code"><el-input v-model="form.box_code" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="终端编号" prop="terminal_code"><el-input v-model="form.terminal_code" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="终端名称" prop="terminal_name"><el-input v-model="form.terminal_name" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="区划"><el-select v-model="form.district_id" style="width:100%"><el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="路段"><el-input v-model="form.road_section" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="位置"><el-input v-model="form.location" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="经度"><el-input-number v-model="form.longitude" :precision="6" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="纬度"><el-input-number v-model="form.latitude" :precision="6" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="灯具数量"><el-input-number v-model="form.light_count" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="功率(KW)"><el-input-number v-model="form.power_load" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="控制器类型"><el-input v-model="form.controller_type" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="安装日期"><el-date-picker v-model="form.install_date" type="date" style="width:100%" value-format="yyyy-MM-dd" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option label="正常" value="normal" /><el-option label="故障" value="fault" /><el-option label="待维护" value="maintenance" /></el-select></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="1" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <span slot="footer"><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api'
export default {
  name: 'StreetLights', data() { return { list:[],total:0,loading:false,districts:[],search:{keyword:'',district_id:'',status:'',page:1,pageSize:20},dialogVisible:false,isEdit:false,saving:false,form:{},rules:{box_code:[{required:true,message:'表箱编码不能为空'}],terminal_code:[{required:true,message:'终端编号不能为空'}],terminal_name:[{required:true,message:'终端名称不能为空'}],name:[{required:true,message:'名称不能为空'}]},templateUrl:'/api/templates/streetlights-import' }},
  mounted() { this.loadDistricts(); this.loadData() },
  methods: {
    async loadDistricts() { const r=await api.get('/system/districts'); this.districts=r||[] },
    async loadData() { this.loading=true; try { const r=await api.get('/streetlights',{params:this.search}); this.list=r.list;this.total=r.total } catch(e){} finally{this.loading=false} },
    openDialog(row) { this.isEdit=!!row; this.form=row?{...row}:{box_code:'',terminal_code:'',terminal_name:'',name:'',district_id:null,road_section:'',location:'',longitude:null,latitude:null,light_count:0,power_load:0,controller_type:'',install_date:'',status:'normal',remark:''}; this.dialogVisible=true },
    async save() { this.$refs.formRef.validate(async v=>{if(!v)return; this.saving=true; try{if(this.isEdit)await api.put('/streetlights/'+this.form.id,this.form);else await api.post('/streetlights',this.form); this.$message.success(this.isEdit?'更新成功':'新增成功'); this.dialogVisible=false; this.loadData() }catch(e){} finally{this.saving=false} }) },
    async del(id) { await api.delete('/streetlights/'+id); this.$message.success('删除成功'); this.loadData() },
    async handleImport(f) { const fd=new FormData(); fd.append('file',f); await api.post('/streetlights/import/excel',fd,{headers:{'Content-Type':'multipart/form-data'}}); this.loadData(); return false },
    statusType(s) { return {normal:'success',fault:'danger',maintenance:'warning'}[s]||'info' }
  }
}
</script>
