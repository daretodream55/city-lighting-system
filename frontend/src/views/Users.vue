<template>
  <div>
    <h2 class="page-title">用户管理</h2>

    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索用户名/姓名..." clearable style="width:240px"
        @clear="loadData" @keyup.enter.native="loadData" />
      <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
      <div style="flex:1" />
      <el-button type="success" icon="el-icon-plus" @click="openDialog()">新增用户</el-button>
    </div>

    <div class="table-container">
      <el-table :data="list" style="width:100%" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="55" label="序号" />
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="realname" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ scope.row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openDialog(scope.row)">编辑</el-button>
            <el-button type="text" size="small" @click="toggleStatus(scope.row)" v-if="scope.row.username !== 'admin'">
              {{ scope.row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-popconfirm title="确认永久删除该用户？" @confirm="deleteUser(scope.row.id)" v-if="scope.row.username !== 'admin'">
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

    <!-- 对话框 -->
    <el-dialog :title="isEdit ? '编辑用户' : '新增用户'" :visible.sync="dialogVisible" width="480px" @closed="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item :label="isEdit ? '新密码' : '密码'" :prop="isEdit ? '' : 'password'">
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit ? '留空则不修改' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="姓名" prop="realname">
          <el-input v-model="form.realname" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width:100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="viewer" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveUser">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: 'Users',
  data() {
    return {
      list: [], total: 0, loading: false,
      search: { keyword: '', page: 1, pageSize: 20 },
      dialogVisible: false, isEdit: false, saving: false,
      form: {},
      rules: {
        username: [{ required: true, message: '用户名不能为空' }],
        password: [{ required: true, message: '密码不能为空', min: 6 }],
        realname: [{ required: true, message: '姓名不能为空' }],
        role: [{ required: true, message: '请选择角色' }]
      }
    }
  },
  mounted() { this.loadData() },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const res = await api.get('/system/users', { params: this.search })
        this.list = res.list; this.total = res.total
      } catch (e) {} finally { this.loading = false }
    },
    openDialog(row) {
      this.isEdit = !!row
      this.form = row ? { ...row, password: '' } : { username: '', password: '', realname: '', role: 'viewer' }
      this.dialogVisible = true
    },
    resetForm() { this.$refs.formRef && this.$refs.formRef.resetFields() },
    async saveUser() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const data = { ...this.form }
          if (this.isEdit && !data.password) delete data.password
          if (this.isEdit) { await api.put(`/system/users/${this.form.id}`, data) }
          else { await api.post('/system/users', data) }
          this.$message.success(this.isEdit ? '更新成功' : '新增成功')
          this.dialogVisible = false; this.loadData()
        } catch (e) {} finally { this.saving = false }
      })
    },
    async toggleStatus(row) {
      await api.put(`/system/users/${row.id}`, { status: row.status === 1 ? 0 : 1 })
      this.$message.success(row.status === 1 ? '已禁用' : '已启用')
      this.loadData()
    },
    async deleteUser(id) {
      await api.delete(`/system/users/${id}`)
      this.$message.success('删除成功'); this.loadData()
    },
    handleSizeChange(val) { this.search.pageSize = val; this.loadData() }
  }
}
</script>
