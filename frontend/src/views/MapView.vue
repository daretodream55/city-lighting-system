<template>
  <div>
    <h2 class="page-title">地图可视化</h2>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-select v-model="search.status" placeholder="设备状态" clearable style="width:140px" @change="filterMarkers">
        <el-option label="全部" value="" />
        <el-option label="正常" value="normal" />
        <el-option label="故障中" value="fault" />
        <el-option label="待维护" value="maintenance" />
        <el-option label="待抢修" value="repair" />
      </el-select>
      <el-select v-model="search.district_id" placeholder="选择区划" clearable style="width:150px" @change="filterMarkers">
        <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-input v-model="search.keyword" placeholder="搜索设备名称..." clearable style="width:200px"
        @clear="filterMarkers" @keyup.enter.native="filterMarkers" />
      <el-button type="primary" icon="el-icon-search" @click="filterMarkers">查询</el-button>
      <span style="color:#999;margin-left:12px">
        已定位 <b style="color:#1a237e">{{ filteredDevices.length }}</b> / {{ allDevices.length }} 台设备
      </span>
      <div style="flex:1" />
      <el-radio-group v-model="mapType" size="small" @change="switchMapType">
        <el-radio-button label="standard">标准地图</el-radio-button>
        <el-radio-button label="satellite">卫星地图</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 地图容器 -->
    <div class="map-container" ref="mapContainer" v-loading="mapLoading">
      <div id="leaflet-map" ref="mapEl" style="width:100%;height:100%"></div>
    </div>
  </div>
</template>

<script>
import api from '../api'
import L from 'leaflet'

// 修复默认图标问题
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

// 自定义状态图标
const statusIcons = {
  normal: L.divIcon({
    className: 'custom-marker',
    html: '<div style="background:#67c23a;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  }),
  fault: L.divIcon({
    className: 'custom-marker',
    html: '<div style="background:#f56c6c;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  }),
  maintenance: L.divIcon({
    className: 'custom-marker',
    html: '<div style="background:#e6a23c;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  }),
  repair: L.divIcon({
    className: 'custom-marker',
    html: '<div style="background:#f093fb;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  }),
  scrapped: L.divIcon({
    className: 'custom-marker',
    html: '<div style="background:#909399;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  })
}

export default {
  name: 'MapView',
  data() {
    return {
      allDevices: [], filteredDevices: [], districts: [],
      search: { status: '', district_id: '', keyword: '' },
      mapType: 'standard',
      mapLoading: false,
      map: null,
      markerLayer: null,
      tileLayers: {},
      statusMap: { normal: '正常', fault: '故障中', maintenance: '待维护', repair: '待抢修', scrapped: '已报废' }
    }
  },
  async mounted() {
    this.mapLoading = true
    try {
      const [devicesRes, districtsRes] = await Promise.all([
        api.get('/devices', { params: { pageSize: 9999 } }),
        api.get('/system/districts')
      ])
      this.allDevices = (devicesRes.list || []).filter(d => d.status !== 'deleted' && d.latitude && d.longitude)
      this.districts = districtsRes || []
      this.filteredDevices = [...this.allDevices]

      // 使用 nextTick 确保 DOM 渲染完成后初始化地图
      await this.$nextTick()
      this.initMap()
    } catch (e) {
      this.mapLoading = false
    }
  },
  beforeDestroy() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  },
  methods: {
    initMap() {
      const el = this.$refs.mapEl
      if (!el) return

      // 确保父容器有明确尺寸
      const container = this.$refs.mapContainer
      if (container) {
        const rect = container.getBoundingClientRect()
        // 给容器设置最小高度，防止初始尺寸为0
        if (rect.height < 100) {
          container.style.height = 'calc(100vh - 180px)'
          container.style.minHeight = '500px'
        }
      }

      // 衡阳市中心坐标
      const center = [26.893, 112.572]

      // 创建地图
      this.map = L.map(el, {
        center: center,
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      })

      // 添加高德地图瓦片图层 - 国内访问更快
      this.tileLayers.standard = L.tileLayer(
        'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        {
          subdomains: '1234',
          maxZoom: 18,
          minZoom: 3,
          crossOrigin: true,
          errorTileUrl: ''
        }
      ).addTo(this.map)

      this.tileLayers.satellite = L.tileLayer(
        'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        {
          subdomains: '1234',
          maxZoom: 18,
          minZoom: 3,
          crossOrigin: true
        }
      )

      // 创建标记图层组
      this.markerLayer = L.layerGroup().addTo(this.map)

      // 添加设备标记
      this.addMarkers()

      // 地图加载完成后强制刷新尺寸 - 多次调用确保瓦片完整加载
      this.map.whenReady(() => {
        // 第一次：立即刷新
        this.map.invalidateSize()
        // 第二次：100ms 后刷新
        setTimeout(() => {
          this.map.invalidateSize()
        }, 100)
        // 第三次：500ms 后刷新（等待瓦片开始加载）
        setTimeout(() => {
          this.map.invalidateSize()
        }, 500)
        // 第四次：1秒后刷新（确保所有瓦片渲染完毕）
        setTimeout(() => {
          this.map.invalidateSize()
        }, 1000)
      })

      // 监听瓦片加载错误
      this.map.on('tileerror', (e) => {
        console.warn('地图瓦片加载失败:', e.tile.src)
      })

      // 监听窗口大小变化
      window.addEventListener('resize', this.handleResize)

      this.mapLoading = false
    },

    addMarkers() {
      if (!this.markerLayer) return
      this.markerLayer.clearLayers()

      this.filteredDevices.forEach(device => {
        const icon = statusIcons[device.status] || statusIcons.normal
        const marker = L.marker([device.latitude, device.longitude], { icon })

        const popupContent = `
          <div class="device-popup">
            <h4>${device.name}</h4>
            <p><b>编码:</b> ${device.device_code}</p>
            <p><b>区划:</b> ${device.district_name || '-'}</p>
            <p><b>路段:</b> ${device.road_section || '-'}</p>
            <p><b>位置:</b> ${device.location || '-'}</p>
            <p><b>型号:</b> ${device.transformer_type || '-'}</p>
            <p><b>容量:</b> ${device.capacity || '-'} KVA</p>
            <p><b>状态:</b> <span style="color:${this.getStatusColor(device.status)}">${this.statusMap[device.status]}</span></p>
            <p style="margin-top:8px">
              <button onclick="navigator.clipboard.writeText('${device.latitude},${device.longitude}')"
                style="padding:4px 12px;background:#1a237e;color:#fff;border:none;border-radius:4px;cursor:pointer">
                复制坐标
              </button>
            </p>
          </div>
        `

        marker.bindPopup(popupContent, { maxWidth: 280 })
        this.markerLayer.addLayer(marker)
      })

      // 适配所有标记的视野
      if (this.filteredDevices.length > 0) {
        const bounds = this.filteredDevices.map(d => [d.latitude, d.longitude])
        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      }
    },

    filterMarkers() {
      const { status, district_id, keyword } = this.search
      this.filteredDevices = this.allDevices.filter(d => {
        if (status && d.status !== status) return false
        if (district_id && d.district_id != district_id) return false
        if (keyword && !d.name.includes(keyword) && !d.device_code.includes(keyword)) return false
        return true
      })
      this.addMarkers()
    },

    switchMapType(type) {
      if (!this.map) return
      Object.values(this.tileLayers).forEach(layer => {
        if (this.map.hasLayer(layer)) this.map.removeLayer(layer)
      })
      this.tileLayers[type].addTo(this.map)
    },

    handleResize() {
      if (this.map) {
        this.map.invalidateSize()
      }
    },

    getStatusColor(status) {
      return { normal: '#67c23a', fault: '#f56c6c', maintenance: '#e6a23c', repair: '#f093fb', scrapped: '#909399' }[status] || '#999'
    }
  }
}
</script>
