<template>
  <div class="min-h-screen bg-btc-dark">
    <!-- 头部 -->
    <header class="bg-btc-card border-b border-btc-border px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-btc-orange flex items-center justify-center text-xl font-bold">
            ₿
          </div>
          <div>
            <h1 class="text-xl font-bold">BTC 抄底逃顶指标</h1>
            <p class="text-sm text-gray-400">比特币链上估值指标可视化</p>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right">
            <div class="text-sm text-gray-400">当前价格</div>
            <div class="text-lg font-bold" :class="priceChange >= 0 ? 'text-green-500' : 'text-red-500'">
              <span v-if="priceLoading" class="text-gray-500">加载中...</span>
              <span v-else>${{ formatNumber(currentPrice) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-400">最新恐惧贪婪</div>
            <div class="text-lg font-bold" :class="fearGreedColor">
              <span v-if="fgLoading" class="text-gray-500">...</span>
              <span v-else>{{ fearGreedValue }} {{ fearGreedLabel }}</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="max-w-7xl mx-auto p-6">
      <!-- 控制栏 -->
      <div class="flex flex-wrap items-center gap-4 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">时间周期：</span>
          <button
            v-for="period in periods"
            :key="period.value"
            @click="currentPeriod = period.value"
            class="px-3 py-1 rounded text-sm transition-colors"
            :class="currentPeriod === period.value
              ? 'bg-btc-orange text-white'
              : 'bg-btc-card text-gray-400 hover:text-white hover:bg-btc-border'"
          >
            {{ period.label }}
          </button>
        </div>
        <div class="w-px h-5 bg-btc-border"></div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">链上指标：</span>
          <button
            v-for="ind in indicatorList"
            :key="ind.key"
            @click="currentIndicator = ind.key"
            class="px-3 py-1 rounded text-sm transition-colors"
            :class="currentIndicator === ind.key
              ? 'bg-btc-orange text-white'
              : 'bg-btc-card text-gray-400 hover:text-white hover:bg-btc-border'"
          >
            {{ ind.label }}
          </button>
        </div>
      </div>

      <!-- 价格+指标叠加图（相邻布局，共享时间轴） -->
      <div class="bg-btc-card rounded-lg border border-btc-border p-4 relative">
        <div class="flex items-center justify-between mb-2">
          <div>
            <h2 class="text-lg font-semibold">
              BTC 价格 + {{ currentIndicatorInfo.label }}
              <span class="text-xs font-normal text-gray-500 ml-2">数据来源: Blockchain.info + 链上公开数据</span>
            </h2>
          </div>
          <div class="flex items-center gap-4 text-xs">
            <span class="text-gray-400">抄底: <span class="text-green-500">{{ currentIndicatorInfo.buyRange }}</span></span>
            <span class="text-gray-400">逃顶: <span class="text-red-500">{{ currentIndicatorInfo.sellRange }}</span></span>
          </div>
        </div>

        <!-- 价格图（对数坐标） -->
        <div ref="priceChartRef" class="w-full" style="height: 300px;"></div>

        <!-- 指标图（与价格图相邻，共享时间轴） -->
        <div ref="indicatorChartRef" class="w-full border-t border-btc-border" style="height: 250px;"></div>

        <!-- loading 覆盖层 -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-btc-card/80 rounded-lg">
          <div class="flex items-center gap-2 text-gray-400">
            <svg class="animate-spin h-5 w-5 text-btc-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>正在加载真实数据...</span>
          </div>
        </div>
        <!-- error 提示 -->
        <div v-if="errorMsg && !loading" class="absolute top-2 right-2 bg-red-500/20 border border-red-500/50 text-red-400 text-xs px-3 py-1 rounded">
          {{ errorMsg }}
        </div>
      </div>

      <!-- 指标说明 -->
      <div class="mt-4 bg-btc-card rounded-lg border border-btc-border p-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-btc-orange">{{ currentIndicatorInfo.label }}</h3>
            <p class="text-sm text-gray-400 mt-1">{{ currentIndicatorInfo.description }}</p>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-400">当前值</div>
            <div class="text-lg font-bold" :class="indicatorValueColor">{{ formatIndicatorValue(currentIndicatorInfo.current) }}</div>
          </div>
        </div>
      </div>

      <!-- 风险提示 -->
      <div class="mt-6 text-center text-xs text-gray-500">
        <p>⚠️ 数据仅供参考，不构成投资建议。加密货币投资存在风险，请谨慎决策。</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts'
import { fetchMarketPrice } from './data/blockchainInfo.js'
import { fetchFearGreed } from './data/alternativeMe.js'
import { INDICATOR_META } from './data/onchain.js'

// ===== DOM 引用 =====
const priceChartRef = ref(null)
const indicatorChartRef = ref(null)
let priceChart = null
let indicatorChart = null
let priceSeries = null
let indicatorSeries = null
let syncing = false

// ===== 状态 =====
const currentPeriod = ref('all')
const currentIndicator = ref('mvrv')

const priceData = ref([])
const loading = ref(false)
const errorMsg = ref('')

const currentPrice = ref(0)
const priceChange = ref(0)
const priceLoading = ref(true)

const fearGreedValue = ref('--')
const fearGreedLabel = ref('')
const fgLoading = ref(true)

const periods = [
  { label: '6月', value: '6m' },
  { label: '1年', value: '1y' },
  { label: '3年', value: '3y' },
  { label: '5年', value: '5y' },
  { label: '全部', value: 'all' }
]

const indicatorList = [
  { key: 'mvrv', label: 'MVRV Z-Score' },
  { key: 'puell', label: 'Puell Multiple' },
  { key: 'sopr', label: 'SOPR' },
  { key: 'fng', label: '恐惧贪婪指数' }
]

const currentIndicatorInfo = computed(() => {
  if (currentIndicator.value === 'fng') {
    return {
      label: '恐惧贪婪指数 Fear & Greed',
      description: '基于市场波动率、成交量、社交媒体等因素综合计算的市场情绪指数。0-24恐惧，75-100贪婪。',
      buyRange: '< 25（极度恐惧）',
      sellRange: '> 75（极度贪婪）',
      current: fearGreedValue.value !== '--' ? parseInt(fearGreedValue.value, 10) : 50
    }
  }
  const meta = INDICATOR_META[currentIndicator.value]
  const data = meta?.data || []
  const current = data.length ? data[data.length - 1].value : 0
  return { ...meta, current }
})

const indicatorValueColor = computed(() => {
  const v = currentIndicatorInfo.value.current
  if (currentIndicator.value === 'fng') {
    return v <= 25 ? 'text-green-500' : v >= 75 ? 'text-red-500' : 'text-btc-orange'
  }
  if (currentIndicator.value === 'mvrv') {
    return v < 0 ? 'text-green-500' : v > 2 ? 'text-red-500' : 'text-btc-orange'
  }
  if (currentIndicator.value === 'puell') {
    return v < 0.5 ? 'text-green-500' : v > 4 ? 'text-red-500' : 'text-btc-orange'
  }
  if (currentIndicator.value === 'sopr') {
    return v < 1.0 ? 'text-green-500' : v > 2.0 ? 'text-red-500' : 'text-btc-orange'
  }
  return 'text-white'
})

const fearGreedColor = computed(() => {
  const v = parseInt(fearGreedValue.value, 10)
  if (isNaN(v)) return 'text-gray-500'
  return v <= 25 ? 'text-green-500' : v <= 45 ? 'text-yellow-500' : v <= 55 ? 'text-btc-orange' : v <= 75 ? 'text-orange-500' : 'text-red-500'
})

// ===== 数据过滤 =====
const filteredPriceData = computed(() => {
  const data = priceData.value
  if (!data.length) return []
  if (currentPeriod.value === 'all') return data
  const lastTime = data[data.length - 1].time
  const months = { '6m': 6, '1y': 12, '3y': 36, '5y': 60 }
  const monthsBack = months[currentPeriod.value]
  const cutoffTime = lastTime - monthsBack * 30 * 24 * 3600
  return data.filter(d => d.time >= cutoffTime)
})

const filteredIndicatorData = computed(() => {
  let data
  if (currentIndicator.value === 'fng') {
    return [] // FNG 单独加载
  }
  data = INDICATOR_META[currentIndicator.value]?.data || []
  if (!data.length) return []
  if (currentPeriod.value === 'all') return data
  const lastTime = data[data.length - 1].time
  const months = { '6m': 6, '1y': 12, '3y': 36, '5y': 60 }
  const monthsBack = months[currentPeriod.value]
  const cutoffTime = lastTime - monthsBack * 30 * 24 * 3600
  return data.filter(d => d.time >= cutoffTime)
})

// ===== 图表初始化 =====
const initCharts = () => {
  if (!priceChartRef.value || !indicatorChartRef.value) return

  const commonOptions = {
    layout: { background: { type: 'solid', color: '#161B22' }, textColor: '#9CA3AF' },
    grid: { vertLines: { color: '#30363D' }, horzLines: { color: '#30363D' } },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#F7931A', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#F7931A' },
      horzLine: { color: '#F7931A', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#F7931A' },
    },
    rightPriceScale: { borderColor: '#30363D' },
    timeScale: { borderColor: '#30363D', timeVisible: false },
    handleScroll: true,
    handleScale: true,
  }

  // 价格图：面积图（对数坐标效果用基础面积 + 合适的价格范围实现）
  priceChart = createChart(priceChartRef.value, {
    ...commonOptions,
    rightPriceScale: { ...commonOptions.rightPriceScale, scaleMargins: { top: 0.05, bottom: 0.05 } },
  })
  priceSeries = priceChart.addAreaSeries({
    lineColor: '#F7931A',
    topColor: 'rgba(247, 147, 26, 0.3)',
    bottomColor: 'rgba(247, 147, 26, 0.0)',
    lineWidth: 2,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
  })

  // 指标图
  indicatorChart = createChart(indicatorChartRef.value, {
    ...commonOptions,
    layout: { ...commonOptions.layout, background: { type: 'solid', color: '#0D1117' } },
    rightPriceScale: { ...commonOptions.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
  })
  indicatorSeries = indicatorChart.addAreaSeries({
    lineColor: '#10B981',
    topColor: 'rgba(16, 185, 129, 0.4)',
    bottomColor: 'rgba(16, 185, 129, 0.05)',
    lineWidth: 2,
  })

  // 双向联动
  priceChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (syncing || !range) return
    syncing = true
    indicatorChart.timeScale().setVisibleLogicalRange(range)
    syncing = false
  })
  indicatorChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (syncing || !range) return
    syncing = true
    priceChart.timeScale().setVisibleLogicalRange(range)
    syncing = false
  })
}

// ===== 图表数据更新 =====
const updatePriceChart = () => {
  if (!priceSeries) return
  const data = filteredPriceData.value.map(d => ({ time: d.time, value: d.price }))
  priceSeries.setData(data)
  if (data.length > 0) {
    priceChart.timeScale().fitContent()
  }
}

const updateIndicatorChart = () => {
  if (!indicatorSeries) return
  let data
  if (currentIndicator.value === 'fng') {
    data = filteredFngData.value.map(d => ({ time: d.time, value: d.value }))
  } else {
    data = filteredIndicatorData.value.map(d => ({ time: d.time, value: d.value }))
  }
  indicatorSeries.setData(data)
  if (data.length > 0) {
    indicatorChart.timeScale().fitContent()
  }
}

const updateCharts = () => {
  updatePriceChart()
  updateIndicatorChart()
}

// ===== 恐惧贪婪指数（单独数据）=====
const fngData = ref([])

const filteredFngData = computed(() => {
  const data = fngData.value
  if (!data.length) return []
  if (currentPeriod.value === 'all') return data
  const lastTime = data[data.length - 1].time
  const months = { '6m': 6, '1y': 12, '3y': 36, '5y': 60 }
  const monthsBack = months[currentPeriod.value] || 24
  const cutoffTime = lastTime - monthsBack * 30 * 24 * 3600
  return data.filter(d => d.time >= cutoffTime)
})

const loadFearGreed = async () => {
  fgLoading.value = true
  try {
    const data = await fetchFearGreed(2000)
    fngData.value = data
    const latest = data[data.length - 1]
    fearGreedValue.value = String(latest.value)
    fearGreedLabel.value = latest.classification
    if (currentIndicator.value === 'fng') {
      updateIndicatorChart()
    }
  } catch (err) {
    console.warn('恐惧贪婪指数加载失败:', err)
    fngData.value = []
  } finally {
    fgLoading.value = false
  }
}

// ===== 价格数据加载 =====
const loadPriceData = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await fetchMarketPrice()
    priceData.value = data
    if (data.length >= 2) {
      currentPrice.value = data[data.length - 1].price
      const prev = data[data.length - 2].price
      priceChange.value = prev > 0 ? ((currentPrice.value - prev) / prev) * 100 : 0
    }
    await nextTick()
    updateCharts()
  } catch (err) {
    console.error('价格数据加载失败:', err)
    errorMsg.value = `价格数据加载失败：${err.message}`
  } finally {
    loading.value = false
    priceLoading.value = false
  }
}

// ===== 监听 =====
watch(currentPeriod, () => nextTick(() => updateCharts()))
watch(currentIndicator, () => nextTick(() => {
  if (currentIndicator.value === 'fng') {
    updateIndicatorChart()
  } else {
    updateIndicatorChart()
  }
}))

// ===== 格式化 =====
const formatNumber = (num) => {
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return num.toFixed(2)
}

const formatIndicatorValue = (value) => {
  if (Math.abs(value) >= 10) return value.toFixed(2)
  if (Math.abs(value) >= 1) return value.toFixed(3)
  return value.toFixed(4)
}

// ===== 初始化 =====
let resizeHandler = null

onMounted(async () => {
  await nextTick()
  initCharts()

  // 并行加载价格和恐惧贪婪指数
  await Promise.all([loadPriceData(), loadFearGreed()])

  resizeHandler = () => {
    if (priceChartRef.value) priceChart?.resize(priceChartRef.value.clientWidth, 300)
    if (indicatorChartRef.value) indicatorChart?.resize(indicatorChartRef.value.clientWidth, 250)
  }
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  priceChart?.remove()
  indicatorChart?.remove()
})
</script>
