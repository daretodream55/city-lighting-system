<template>
  <div>
    <h2 class="page-title">运维管理</h2>

    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索标题/处理人/设备名称..." clearable style="width:220px"
        @clear="loadData" @keyup.enter.native="loadData" />
      <el-select v-model="search.maintenance_type" placeholder="运维类型" clearable style="width:140px" @change="loadData">
        <el-option label="例行维护" value="routine" />
        <el-option label="故障抢修" value="repair" />
        <el-option label="季度巡检" value="inspection" />
        <el-option label="年度检修" value="annual" />
        <el-option label="预防性试验" value="preventive" />
        <el-option label="电房整治" value="room" />
        <el-option label="元器件更换" value="component" />
      </el-select>
      <el-select v-model="search.status" placeholder="处理状态" clearable style="width:130px" @change="loadData">
        <el-option label="待处理" value="pending" />
        <el-option label="处理中" value="in_progress" />
        <el-option label="已完成" value="completed" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
      <div style="flex:1" />
      <el-button type="success" icon="el-icon-plus" @click="openDialog()">新增运维记录</el-button>
    </div>

    <div class="table-container">
      <el-table :data="list" style="width:100%" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="55" label="序号" />
        <el-table-column prop="device_name" label="关联设备" min-width="160" show-overflow-tooltip />
        <el-table-column prop="device_code" label="设备编码" width="130" />
        <el-table-column prop="district_name" label="区划" width="90" />
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column prop="maintenance_type" label="类型" width="110">
          <template slot-scope="scope">{{ typeMap[scope.row.maintenance_type] }}</template>
        </el-table-column>
        <el-table-column prop="handler" label="处理人" width="100" />
        <el-table-column prop="maintenance_date" label="维护日期" width="110" />
        <el-table-column prop="next_maintenance_date" label="下次维护" width="110" />
        <el-table-column prop="cost" label="费用(元)" width="90" align="right" />
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="scope">
            <el-tag :type="statusType(scope.row.status)" size="small">{{ statusMap[scope.row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openDialog(scope.row)">编辑</el-button>
            <el-popconfirm title="确认删除该记录？" @confirm="deleteRecord(scope.row.id)">
              <el-button type="text" size="small" style="color:#f56c6c" slot="reference">删除</el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div style="text-align:right;padding:12px 0">
        <el-pagination
          background layout="total, sizes, prev, pager, next"
          :total="total" :page-size="search.pageSize" :current-page.sync="search.page"
          :page-sizes="[10,20,50]" @size-change="handleSizeChange" @current-change="loadData"
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="isEdit ? '编辑运维记录' : '新增运维记录'" :visible.sync="dialogVisible" width="650px" @closed="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="关联设备" prop="device_id">
          <el-select v-model="form.device_id" filterable placeholder="选择设备" style="width:100%">
            <el-option v-for="d in devices" :key="d.id" :label="`${d.name} (${d.device_code})`" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="运维类型" prop="maintenance_type">
          <el-select v-model="form.maintenance_type" style="width:100%">
            <el-option v-for="(v,k) in typeMap" :key="k" :label="v" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="维护日期" prop="maintenance_date">
          <el-date-picker v-model="form.maintenance_date" type="date" style="width:100%" value-format="yyyy-MM-dd" />
        </el-form-item>
        <el-form-item label="下次维护">
          <el-date-picker v-model="form.next_maintenance_date" type="date" style="width:100%" value-format="yyyy-MM-dd" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="维护/故障描述" />
        </el-form-item>
        <el-form-item label="处理结果">
          <el-input v-model="form.result" type="textarea" :rows="2" placeholder="处理结果及结论" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="处理人">
              <el-input v-model="form.handler" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="费用(元)">
              <el-input-number v-model="form.cost" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="1" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRecord">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: 'Maintenance',
  data() {
    return {
      list: [], total: 0, loading: false, devices: [],
      search: { keyword: '', maintenance_type: '', status: '', page: 1, pageSize: 20 },
      dialogVisible: false, isEdit: false, saving: false,
      form: {},
      rules: {
        device_id: [{ required: true, message: '请选择设备', trigger: 'change' }],
        title: [{ required: true, message: '标题不能为空', trigger: 'blur' }],
        maintenance_type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        maintenance_date: [{ required: true, message: '请选择日期', trigger: 'change' }]
      },
      typeMap: { routine: '例行维护', repair: '故障抢修', inspection: '季度巡检', annual: '年度检修', preventive: '预防性试验', room: '电房整治', component: '元器件更换' },
      statusMap: { pending: '待处理', in_progress: '处理中', completed: '已完成' }
    }
  },
  mounted() { this.loadDevices(); this.loadData() },
  methods: {
    async loadDevices() {
      const res = await api.get('/devices', { params: { pageSize: 9999, status: '' } })
      this.devices = (res.list || []).filter(d => d.status !== 'deleted')
    },
    async loadData() {
      this.loading = true
      try {
        const res = await api.get('/maintenance', { params: this.search })
        this.list = res.list; this.total = res.total
      } catch (e) {} finally { this.loading = false }
    },
    openDialog(row) {
      this.isEdit = !!row
      this.form = row ? { ...row } : {
        device_id: null, maintenance_type: 'routine', title: '', description: '', result: '',
        maintenance_date: '', next_maintenance_date: null, cost: 0, handler: '', status: 'pending', remark: ''
      }
      this.dialogVisible = true
    },
    resetForm() { this.$refs.formRef && this.$refs.formRef.resetFields() },
    async saveRecord() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          if (this.isEdit) { await api.put(`/maintenance/${this.form.id}`, this.form) }
          else { await api.post('/maintenance', this.form) }
          this.$message.success(this.isEdit ? '更新成功' : '新增成功')
          this.dialogVisible = false; this.loadData()
        } catch (e) {} finally { this.saving = false }
      })
    },
    async deleteRecord(id) {
      await api.delete(`/maintenance/${id}`)
      this.$message.success('删除成功'); this.loadData()
    },
    handleSizeChange(val) { this.search.pageSize = val; this.loadData() },
    statusType(s) { return { pending: 'warning', in_progress: '', completed: 'success' }[s] || 'info' }
  }
}
</script>
