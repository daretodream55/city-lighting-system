<template>
  <div class="main-layout">
    <header class="main-header">
      <div class="logo">城市照明专变管理系统</div>
      <div class="user-info">
        <span>{{ user.realname || user.username }}</span>
        <el-dropdown @command="handleCommand">
          <span style="color:#fff;cursor:pointer">
            <i class="el-icon-setting" style="margin-right:4px"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="profile">个人资料</el-dropdown-item>
            <el-dropdown-item command="password">修改密码</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </header>
    <div class="main-body">
      <aside class="main-sidebar">
        <el-menu
          class="sidebar-menu"
          :default-active="activeMenu"
          :default-openeds="defaultOpeneds"
          router
          background-color="#fff"
          text-color="#333"
          active-text-color="#1a237e"
        >
          <el-menu-item index="/overview">
            <i class="el-icon-s-home"></i><span>总览（概览）</span>
          </el-menu-item>

          <el-menu-item index="/devices">
            <i class="el-icon-s-order"></i><span>专变台账管理</span>
          </el-menu-item>

          <el-submenu index="base">
            <template slot="title">
              <i class="el-icon-menu"></i><span>基础数据</span>
            </template>
            <el-menu-item index="/streetlights">路灯表箱管理</el-menu-item>
            <el-menu-item index="/landscape">景观表箱管理</el-menu-item>
          </el-submenu>

          <el-menu-item index="/search">
            <i class="el-icon-search"></i><span>查询筛选</span>
          </el-menu-item>

          <el-submenu index="maintenance">
            <template slot="title">
              <i class="el-icon-s-tools"></i><span>运维管理</span>
            </template>
            <el-menu-item index="/maintenance/routine">例行维护检修</el-menu-item>
            <el-menu-item index="/maintenance/component">元器件更换</el-menu-item>
            <el-menu-item index="/maintenance/repair">故障抢修</el-menu-item>
            <el-menu-item index="/maintenance/reminders">维护提醒</el-menu-item>
          </el-submenu>

          <el-submenu index="reports">
            <template slot="title">
              <i class="el-icon-s-data"></i><span>统计报表</span>
            </template>
            <el-menu-item index="/reports/devices">设备统计</el-menu-item>
            <el-menu-item index="/reports/ops">运维统计</el-menu-item>
            <el-menu-item index="/reports/faults">故障统计</el-menu-item>
            <el-menu-item index="/reports/export">月度导出</el-menu-item>
          </el-submenu>

          <el-menu-item index="/map">
            <i class="el-icon-location-outline"></i><span>地图可视化</span>
          </el-menu-item>

          <template v-if="user.role === 'admin'">
            <el-menu-item index="/users">
              <i class="el-icon-user"></i><span>用户管理</span>
            </el-menu-item>
          </template>

          <el-menu-item index="/logs">
            <i class="el-icon-document"></i><span>操作日志</span>
          </el-menu-item>

          <template v-if="user.role === 'admin'">
            <el-menu-item index="/config">
              <i class="el-icon-setting"></i><span>系统配置</span>
            </el-menu-item>
          </template>
        </el-menu>
      </aside>
      <main class="main-content">
        <router-view />
      </main>
    </div>

    <el-dialog title="修改密码" :visible.sync="pwdDialogVisible" width="420px">
      <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="100px">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="changePassword">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: 'Layout',
  data() {
    return {
      user: {},
      pwdDialogVisible: false,
      pwdForm: { oldPassword: '', newPassword: '', confirmPassword: '' },
      pwdRules: {
        oldPassword: [{ required: true, message: '请输入原密码' }],
        newPassword: [{ required: true, message: '请输入新密码', min: 6 }],
        confirmPassword: [
          { required: true, message: '请确认新密码' },
          { validator: (rule, value, cb) => {
            if (value !== this.pwdForm.newPassword) cb(new Error('两次密码不一致'))
            else cb()
          }}
        ]
      }
    }
  },
  computed: {
    activeMenu() { return this.$route.path },
    defaultOpeneds() {
      const p = this.$route.path
      if (p.startsWith('/streetlights') || p.startsWith('/landscape')) return ['base']
      if (p.startsWith('/maintenance')) return ['maintenance']
      if (p.startsWith('/reports')) return ['reports']
      return []
    }
  },
  created() {
    const u = localStorage.getItem('user')
    if (u) this.user = JSON.parse(u)
  },
  methods: {
    handleCommand(cmd) {
      if (cmd === 'logout') { localStorage.clear(); this.$router.push('/login') }
      else if (cmd === 'password') {
        this.pwdForm = { oldPassword: '', newPassword: '', confirmPassword: '' }
        this.pwdDialogVisible = true
      } else if (cmd === 'profile') {
        this.$message.info('用户名: ' + this.user.username + ' | 角色: ' + (this.user.role === 'admin' ? '管理员' : '普通用户'))
      }
    },
    async changePassword() {
      this.$refs.pwdFormRef.validate(async valid => {
        if (!valid) return
        try {
          await api.put('/auth/password', { oldPassword: this.pwdForm.oldPassword, newPassword: this.pwdForm.newPassword })
          this.$message.success('密码修改成功')
          this.pwdDialogVisible = false
        } catch (e) {}
      })
    }
  }
}
</script>
