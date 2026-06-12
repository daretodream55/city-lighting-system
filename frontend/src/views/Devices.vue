<template>
  <div>
    <h2 class="page-title">专变台账管理</h2>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索设备名称/编码/路段..." clearable style="width:240px"
        @clear="loadData" @keyup.enter.native="loadData" />
      <el-select v-model="search.district_id" placeholder="选择区划" clearable style="width:150px" @change="loadData">
        <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-select v-model="search.status" placeholder="状态筛选" clearable style="width:130px" @change="loadData">
        <el-option label="正常" value="normal" />
        <el-option label="故障中" value="fault" />
        <el-option label="待维护" value="maintenance" />
        <el-option label="待抢修" value="repair" />
        <el-option label="已报废" value="scrapped" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
      <div style="flex:1" />
      <el-button type="success" icon="el-icon-plus" @click="openDialog()">新增设备</el-button>
      <a :href="templateUrl" download style="text-decoration:none"><el-button icon="el-icon-download">下载导入模板</el-button></a>
      <el-upload
        :show-file-list="false"
        :before-upload="handleImport"
        accept=".xlsx,.xls"
        action=""
      >
        <el-button icon="el-icon-upload2">导入Excel</el-button>
      </el-upload>
      <el-button icon="el-icon-download" @click="exportExcel">导出Excel</el-button>
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <el-table :data="list" style="width:100%" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="55" label="序号" />
        <el-table-column prop="device_code" label="设备编码" width="130" />
        <el-table-column prop="terminal_code" label="终端编号" width="110" />
        <el-table-column prop="name" label="设备名称" min-width="170" show-overflow-tooltip />
        <el-table-column prop="district_name" label="区划" width="90" />
        <el-table-column prop="road_section" label="路段" width="120" show-overflow-tooltip />
        <el-table-column prop="location" label="位置" min-width="180" show-overflow-tooltip />
        <el-table-column prop="transformer_type" label="变压器型号" width="130" />
        <el-table-column prop="capacity" label="容量(KVA)" width="100" align="right" />
        <el-table-column prop="manufacturer" label="制造商" width="120" />
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="scope">
            <el-tag :type="statusType(scope.row.status)" size="small">{{ statusMap[scope.row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openDialog(scope.row)">编辑</el-button>
            <el-button type="text" size="small" @click="viewDetail(scope.row)">详情</el-button>
            <el-popconfirm title="确认删除该设备？" @confirm="deleteDevice(scope.row.id)">
              <el-button type="text" size="small" style="color:#f56c6c" slot="reference">删除</el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div style="text-align:right;padding:12px 0">
        <el-pagination
          background layout="total, sizes, prev, pager, next"
          :total="total" :page-size="search.pageSize" :current-page.sync="search.page"
          :page-sizes="[10,20,50,100]" @size-change="handleSizeChange" @current-change="loadData"
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="isEdit ? '编辑设备' : '新增设备'" :visible.sync="dialogVisible" width="750px" @closed="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备编码" prop="device_code">
              <el-input v-model="form.device_code" placeholder="请输入设备编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="终端编号" prop="terminal_code">
              <el-input v-model="form.terminal_code" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属区划" prop="district_id">
              <el-select v-model="form.district_id" style="width:100%" placeholder="请选择区划">
                <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="路段">
              <el-input v-model="form.road_section" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="详细位置" prop="location">
              <el-input v-model="form.location" placeholder="请输入详细位置" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经度">
              <el-input-number v-model="form.longitude" :precision="6" :step="0.001" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度">
              <el-input-number v-model="form.latitude" :precision="6" :step="0.001" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="变压器型号">
              <el-input v-model="form.transformer_type" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="容量(KVA)">
              <el-input-number v-model="form.capacity" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="制造商">
              <el-input v-model="form.manufacturer" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供电账户号">
              <el-input v-model="form.power_account" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="控制箱号">
              <el-input v-model="form.control_box" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="安装日期">
              <el-date-picker v-model="form.install_date" type="date" placeholder="选择日期" style="width:100%" value-format="yyyy-MM-dd" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width:100%">
                <el-option label="正常" value="normal" />
                <el-option label="故障中" value="fault" />
                <el-option label="待维护" value="maintenance" />
                <el-option label="待抢修" value="repair" />
                <el-option label="已报废" value="scrapped" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDevice">保存</el-button>
      </span>
    </el-dialog>

    <!-- 详情对话框（只读） -->
    <el-dialog title="设备详情" :visible.sync="detailVisible" width="750px">
      <el-descriptions :column="2" border size="small" label-class-name="detail-label">
        <el-descriptions-item label="设备编码">{{ detailForm.device_code }}</el-descriptions-item>
        <el-descriptions-item label="终端编号">{{ detailForm.terminal_code }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ detailForm.name }}</el-descriptions-item>
        <el-descriptions-item label="所属区划">{{ detailForm.district_name }}</el-descriptions-item>
        <el-descriptions-item label="路段">{{ detailForm.road_section || '-' }}</el-descriptions-item>
        <el-descriptions-item label="详细位置">{{ detailForm.location || '-' }}</el-descriptions-item>
        <el-descriptions-item label="经度">{{ detailForm.longitude || '-' }}</el-descriptions-item>
        <el-descriptions-item label="纬度">{{ detailForm.latitude || '-' }}</el-descriptions-item>
        <el-descriptions-item label="变压器型号">{{ detailForm.transformer_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="容量(KVA)">{{ detailForm.capacity || '-' }}</el-descriptions-item>
        <el-descriptions-item label="制造商">{{ detailForm.manufacturer || '-' }}</el-descriptions-item>
        <el-descriptions-item label="供电账户号">{{ detailForm.power_account || '-' }}</el-descriptions-item>
        <el-descriptions-item label="控制箱号">{{ detailForm.control_box || '-' }}</el-descriptions-item>
        <el-descriptions-item label="安装日期">{{ detailForm.install_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(detailForm.status)" size="small">{{ statusMap[detailForm.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailForm.created_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailForm.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <span slot="footer">
        <el-button type="primary" @click="detailVisible=false; openDialog(detailForm)">编辑此设备</el-button>
        <el-button @click="detailVisible=false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: 'Devices',
  data() {
    return {
      list: [], total: 0, loading: false,
      search: { keyword: '', district_id: '', status: '', page: 1, pageSize: 20 },
      districts: [],
      templateUrl: '/api/templates/devices-import',
      dialogVisible: false, isEdit: false, detailVisible: false, saving: false,
      detailForm: {},
      form: {},
      rules: {
        device_code: [{ required: true, message: '设备编码不能为空', trigger: 'blur' }],
        name: [{ required: true, message: '设备名称不能为空', trigger: 'blur' }],
        district_id: [{ required: true, message: '请选择所属区划', trigger: 'change' }],
        location: [{ required: true, message: '详细位置不能为空', trigger: 'blur' }]
      },
      statusMap: { normal: '正常', fault: '故障中', maintenance: '待维护', repair: '待抢修', scrapped: '已报废', deleted: '已删除' }
    }
  },
  mounted() {
    this.loadDistricts()
    this.loadData()
  },
  methods: {
    async loadDistricts() {
      const res = await api.get('/system/districts')
      this.districts = res || []
    },
    async loadData() {
      this.loading = true
      try {
        const res = await api.get('/devices', { params: this.search })
        this.list = res.list
        this.total = res.total
      } catch (e) {} finally { this.loading = false }
    },
    openDialog(row) {
      this.isEdit = !!row
      if (row) {
        this.form = { ...row }
      } else {
        this.form = { device_code: '', terminal_code: '', name: '', district_id: null, road_section: '',
          location: '', longitude: null, latitude: null, transformer_type: '', capacity: null,
          manufacturer: '', power_account: '', control_box: '', install_date: '', status: 'normal', remark: '' }
      }
      this.dialogVisible = true
    },
    resetForm() {
      this.$refs.formRef && this.$refs.formRef.resetFields()
    },
    async saveDevice() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          if (this.isEdit) {
            await api.put(`/devices/${this.form.id}`, this.form)
          } else {
            await api.post('/devices', this.form)
          }
          this.$message.success(this.isEdit ? '更新成功' : '新增成功')
          this.dialogVisible = false
          this.loadData()
        } catch (e) {} finally { this.saving = false }
      })
    },
    async deleteDevice(id) {
      try {
        await api.delete(`/devices/${id}`)
        this.$message.success('删除成功')
        this.loadData()
      } catch (e) {}
    },
    viewDetail(row) {
      this.detailForm = { ...row }
      this.detailVisible = true
    },
    handleSizeChange(val) { this.search.pageSize = val; this.loadData() },
    statusType(s) {
      return { normal: 'success', fault: 'danger', maintenance: 'warning', repair: 'danger', scrapped: 'info' }[s] || 'info'
    },
    async exportExcel() {
      const params = { ...this.search }
      delete params.page; delete params.pageSize
      const res = await api.get('/devices/export/excel', { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res]))
      const a = document.createElement('a')
      a.href = url; a.download = '专变设备台账.xlsx'; a.click()
      URL.revokeObjectURL(url)
    },
    async handleImport(file) {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/devices/import/excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      this.loadData()
      return false
    }
  }
}
</script>
