<template>
  <div class="login-container">
    <div class="login-card">
      <h2>城市照明专变管理系统</h2>
      <p class="subtitle">衡阳市照明设备数字化管理平台</p>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.native.prevent="login">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="el-icon-user" size="medium" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="el-icon-lock" size="medium"
            @keyup.enter.native="login" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="login" style="width:100%">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: 'Login',
  data() {
    return {
      form: { username: 'admin', password: 'admin123' },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      },
      loading: false
    }
  },
  methods: {
    login() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.loading = true
        try {
          const res = await api.post('/auth/login', this.form)
          localStorage.setItem('token', res.token)
          localStorage.setItem('user', JSON.stringify(res.user))
          this.$message.success('登录成功')
          this.$router.push('/dashboard')
        } catch (e) {
          // error handled by interceptor
        } finally {
          this.loading = false
        }
      })
    }
  }
}
</script>
