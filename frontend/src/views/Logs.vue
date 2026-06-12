<template>
  <div>
    <h2 class="page-title">操作日志</h2>

    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索用户名/操作详情..." clearable style="width:240px"
        @clear="loadData" @keyup.enter.native="loadData" />
      <el-select v-model="search.module" placeholder="操作模块" clearable style="width:140px" @change="loadData">
        <el-option label="专变台账" value="专变台账" />
        <el-option label="运维管理" value="运维管理" />
        <el-option label="用户管理" value="用户管理" />
        <el-option label="系统配置" value="系统配置" />
        <el-option label="系统" value="系统" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
      <div style="flex:1" />
      <el-button icon="el-icon-refresh" @click="loadData">刷新</el-button>
    </div>

    <div class="table-container">
      <el-table :data="list" style="width:100%" stripe v-loading="loading" size="small">
        <el-table-column type="index" width="55" label="序号" />
        <el-table-column prop="username" label="操作用户" width="120" />
        <el-table-column prop="action" label="操作" width="90">
          <template slot-scope="scope">
            <el-tag :type="actionType(scope.row.action)" size="small">{{ scope.row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP地址" width="140" />
        <el-table-column prop="created_at" label="操作时间" width="170" />
      </el-table>
      <div style="text-align:right;padding:12px 0">
        <el-pagination
          background layout="total, sizes, prev, pager, next"
          :total="total" :page-size="search.pageSize" :current-page.sync="search.page"
          :page-sizes="[10,20,50,100]" @size-change="handleSizeChange" @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: 'Logs',
  data() {
    return {
      list: [], total: 0, loading: false,
      search: { keyword: '', module: '', page: 1, pageSize: 20 }
    }
  },
  mounted() { this.loadData() },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const res = await api.get('/system/logs', { params: this.search })
        this.list = res.list; this.total = res.total
      } catch (e) {} finally { this.loading = false }
    },
    actionType(action) {
      const map = { '登录': 'success', '新增': 'primary', '编辑': 'warning', '删除': 'danger', '修改': 'warning', '导入': 'info', '导出': 'info' }
      return map[action] || 'info'
    },
    handleSizeChange(val) { this.search.pageSize = val; this.loadData() }
  }
}
</script>
