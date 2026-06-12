<template>
  <div>
    <h2 class="page-title">系统配置</h2>

    <div class="table-container" style="padding:20px">
      <el-form :model="form" label-width="180px" ref="formRef">
        <el-form-item label="系统名称">
          <el-input v-model="form.system_name" />
        </el-form-item>
        <el-form-item label="维护提醒提前天数">
          <el-input-number v-model="form.maintenance_remind_days" :min="1" :max="90" />
          <span style="margin-left:8px;color:#999">到期前多少天开始提醒维护</span>
        </el-form-item>
        <el-form-item label="地图默认中心点">
          <el-input v-model="form.map_default_center" placeholder="纬度,经度 格式" />
          <span style="margin-left:8px;color:#999">衡阳市: 26.893,112.572</span>
        </el-form-item>
        <el-form-item label="地图默认缩放级别">
          <el-input-number v-model="form.map_default_zoom" :min="1" :max="18" />
        </el-form-item>
        <el-form-item label="默认分页大小">
          <el-input-number v-model="form.page_size" :min="5" :max="200" :step="5" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: 'Config',
  data() {
    return { form: {}, saving: false }
  },
  mounted() { this.loadConfig() },
  methods: {
    async loadConfig() {
      const res = await api.get('/system/config')
      const form = {}
      ;(res || []).forEach(item => { form[item.config_key] = item.config_value })
      this.form = form
    },
    async saveConfig() {
      this.saving = true
      try {
        await api.put('/system/config', this.form)
        this.$message.success('配置已保存')
      } catch (e) {} finally { this.saving = false }
    }
  }
}
</script>
