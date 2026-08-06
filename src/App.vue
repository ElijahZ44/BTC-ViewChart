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
        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-sm text-gray-400">当前价格</div>
            <div class="text-lg font-bold" :class="priceChange >= 0 ? 'text-green-500' : 'text-red-500'">
              <span v-if="priceLoading" class="text-gray-500">加载中...</span>
              <span v-else>${{ formatNumber(currentPrice) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-400">24h涨跌</div>
            <div class="text-lg font-bold" :class="priceChange >= 0 ? 'text-green-500' : 'text-red-500'">
              <span v-if="priceLoading" class="text-gray-500">--</span>
              <span v-else>{{ priceChange >= 0 ? '+' : '' }}{{ priceChange.toFixed(2) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="max-w-7xl mx-auto p-6">
      <!-- 数据源 + 时间周期选择 -->
      <div class="flex flex-wrap items-center gap-4 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">数据源：</span>
          <button
            v-for="src in sourceOptions"
            :key="src.key"
            @click="switchSource(src.key)"
            :disabled="loading"
            class="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="currentSource === src.key 
              ? 'bg-btc-orange text-white' 
              : 'bg-btc-card text-gray-400 hover:text-white hover:bg-btc-border'"
          >
            {{ src.label }}
            <span class="text-xs opacity-70">({{ src.source }})</span>
          </button>
        </div>
        <div class="w-px h-5 bg-btc-border"></div>
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
      </div>

      <!-- K线主图 -->
      <div class="bg-btc-card rounded-lg border border-btc-border p-4 mb-4 relative">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">
            {{ currentSourceInfo.label }} K线走势
            <span class="text-xs font-normal text-gray-500 ml-2">数据来源: {{ currentSourceInfo.source }}</span>
          </h2>
          <span class="text-sm text-gray-400">每日收盘价格</span>
        </div>
        <div ref="mainChartRef" class="w-full" style="height: 400px;"></div>
        <!-- loading 覆盖层 -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-btc-card/80 rounded-lg">
          <div class="flex items-center gap-2 text-gray-400">
            <svg class="animate-spin h-5 w-5 text-btc-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>正在加载真实行情数据...</span>
          </div>
        </div>
        <!-- error 提示 -->
        <div v-if="errorMsg && !loading" class="absolute top-2 right-2 bg-red-500/20 border border-red-500/50 text-red-400 text-xs px-3 py-1 rounded">
          {{ errorMsg }}
        </div>
      </div>

      <!-- 副图指标区 -->
      <div class="bg-btc-card rounded-lg border border-btc-border p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">链上估值指标</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-400">选择指标：</span>
            <select
              v-model="currentIndicator"
              class="bg-btc-dark border border-btc-border rounded px-3 py-1 text-sm focus:outline-none focus:border-btc-orange"
            >
              <option v-for="ind in indicators" :key="ind.value" :value="ind.value">
                {{ ind.label }}
              </option>
            </select>
          </div>
        </div>
        
        <!-- 指标说明 -->
        <div class="bg-btc-dark rounded p-3 mb-4">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium text-btc-orange">{{ currentIndicatorInfo.label }}</h3>
              <p class="text-sm text-gray-400 mt-1">{{ currentIndicatorInfo.description }}</p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-400">当前值</div>
              <div class="text-lg font-bold" :class="getValueColor(currentIndicatorInfo.current)">{{ formatIndicatorValue(currentIndicatorInfo.current) }}</div>
            </div>
          </div>
          <!-- 区间参考 -->
          <div class="mt-3 flex items-center gap-4 text-xs">
            <span class="text-gray-500">抄底区间：</span>
            <span class="text-green-500">{{ currentIndicatorInfo.buyRange }}</span>
            <span class="text-gray-500">|</span>
            <span class="text-gray-500">逃顶区间：</span>
            <span class="text-red-500">{{ currentIndicatorInfo.sellRange }}</span>
          </div>
          <div class="mt-2 text-xs text-gray-600">
            * 链上指标当前为近似历史数据，与主图真实价格时间轴对齐；接入 Glassnode/CryptoQuant 付费 API 后可获取真实值。
          </div>
        </div>

        <!-- 副图 -->
        <div ref="subChartRef" class="w-full" style="height: 300px;"></div>
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
import { DATA_SOURCES, loadKlines, loadTicker } from './data/api.js'
import { mvrvData, nuplData, puellData, reserveRiskData } from './data/indicators.js'

// ===== DOM 引用 =====
const mainChartRef = ref(null)
const subChartRef = ref(null)
let mainChart = null
let subChart = null
let mainSeries = null
let subSeries = null
let syncing = false // 防止主副图联动循环

// ===== 状态 =====
const currentSource = ref('BTCUSDT')
const currentPeriod = ref('1y')
const currentIndicator = ref('mvrv')

const klinesData = ref([]) // 当前数据源的完整 K 线
const loading = ref(false)
const errorMsg = ref('')

const currentPrice = ref(0)
const priceChange = ref(0)
const priceLoading = ref(true)

const sourceOptions = Object.values(DATA_SOURCES)
const currentSourceInfo = computed(() => DATA_SOURCES[currentSource.value])

const periods = [
  { label: '3个月', value: '3m' },
  { label: '6个月', value: '6m' },
  { label: '1年', value: '1y' },
  { label: '2年', value: '2y' },
  { label: '全部', value: 'all' }
]

const indicators = [
  { value: 'mvrv', label: 'MVRV 比率' },
  { value: 'nupl', label: 'NUPL 净未实现盈亏' },
  { value: 'puell', label: 'Puell Multiple' },
  { value: 'reserveRisk', label: 'Reserve Risk 储备风险' }
]

const indicatorInfo = {
  mvrv: {
    label: 'MVRV 比率 (Market Value / Realized Value)',
    description: '市值与实现市值的比值，用于判断市场整体估值水平。MVRV < 1 表示市场整体处于亏损状态，是潜在的抄底区域。',
    buyRange: '< 1.0',
    sellRange: '> 3.5',
    data: mvrvData
  },
  nupl: {
    label: 'NUPL 净未实现盈亏 (Net Unrealized Profit/Loss)',
    description: '衡量所有持有BTC的人的净盈亏状态。负值越多越接近底部，正值越高越接近顶部。',
    buyRange: '< 0',
    sellRange: '> 0.75',
    data: nuplData
  },
  puell: {
    label: 'Puell Multiple',
    description: '矿工每日收益除以一年均线，衡量矿工抛售压力。数值低时矿工抛售压力小，可能接近底部。',
    buyRange: '< 0.5',
    sellRange: '> 4.0',
    data: puellData
  },
  reserveRisk: {
    label: 'Reserve Risk 储备风险',
    description: '衡量持有BTC的机会成本。低储备风险时长期持有者在低价积累，高储备风险时长期持有者在高价卖出。',
    buyRange: '< 0.002',
    sellRange: '> 0.02',
    data: reserveRiskData
  }
}

const currentIndicatorInfo = computed(() => {
  const info = indicatorInfo[currentIndicator.value]
  const data = info.data
  const current = data.length ? data[data.length - 1].value : 0
  return { ...info, current }
})

// ===== 数据过滤 =====
const filteredPriceData = computed(() => {
  const data = klinesData.value
  if (!data.length) return []
  if (currentPeriod.value === 'all') return data
  const now = data[data.length - 1].time
  const months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 }
  const cutoffTime = now - months[currentPeriod.value] * 30 * 24 * 3600
  return data.filter(d => d.time >= cutoffTime)
})

const filteredIndicatorData = computed(() => {
  const data = indicatorInfo[currentIndicator.value].data
  if (!data.length) return []
  if (currentPeriod.value === 'all') return data
  const now = data[data.length - 1].time
  const months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 }
  const cutoffTime = now - months[currentPeriod.value] * 30 * 24 * 3600
  return data.filter(d => d.time >= cutoffTime)
})

// ===== 图表初始化（只创建一次，绑定一次联动） =====
const initCharts = () => {
  if (!mainChartRef.value || !subChartRef.value) return

  const commonOptions = {
    layout: {
      background: { type: 'solid', color: '#161B22' },
      textColor: '#9CA3AF',
    },
    grid: {
      vertLines: { color: '#30363D' },
      horzLines: { color: '#30363D' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: '#F7931A',
        width: 1,
        style: LineStyle.Dashed,
        labelBackgroundColor: '#F7931A',
      },
      horzLine: {
        color: '#F7931A',
        width: 1,
        style: LineStyle.Dashed,
        labelBackgroundColor: '#F7931A',
      },
    },
    rightPriceScale: { borderColor: '#30363D' },
    timeScale: { borderColor: '#30363D', timeVisible: false },
  }

  mainChart = createChart(mainChartRef.value, commonOptions)
  mainSeries = mainChart.addCandlestickSeries({
    upColor: '#26A69A',
    downColor: '#EF5350',
    borderUpColor: '#26A69A',
    borderDownColor: '#EF5350',
    wickUpColor: '#26A69A',
    wickDownColor: '#EF5350',
  })

  // 副图用更深的背景以示区分
  subChart = createChart(subChartRef.value, {
    ...commonOptions,
    layout: { ...commonOptions.layout, background: { type: 'solid', color: '#0D1117' } },
  })
  subSeries = subChart.addAreaSeries({
    lineColor: '#F7931A',
    topColor: 'rgba(247, 147, 26, 0.4)',
    bottomColor: 'rgba(247, 147, 26, 0.05)',
    lineWidth: 2,
  })

  // 主副图双向联动（带循环保护）
  mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (syncing || !range) return
    syncing = true
    subChart.timeScale().setVisibleLogicalRange(range)
    syncing = false
  })
  subChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (syncing || !range) return
    syncing = true
    mainChart.timeScale().setVisibleLogicalRange(range)
    syncing = false
  })
}

// ===== 图表数据更新 =====
const updateMainChart = () => {
  if (!mainSeries) return
  mainSeries.setData(filteredPriceData.value)
  mainChart.timeScale().fitContent()
}

const updateSubChart = () => {
  if (!subSeries) return
  const indicatorData = filteredIndicatorData.value.map(d => ({ time: d.time, value: d.value }))
  subSeries.setData(indicatorData)
  subChart.timeScale().fitContent()
}

const updateCharts = () => {
  updateMainChart()
  updateSubChart()
}

// ===== 数据加载 =====
const loadAll = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    // 加载 K 线（缓存优先，后台刷新通过回调更新）
    const data = await loadKlines(currentSource.value, (fresh) => {
      klinesData.value = fresh
      updateMainChart()
    })
    klinesData.value = data
    await nextTick()
    updateCharts()
  } catch (err) {
    console.error('K线加载失败:', err)
    errorMsg.value = `数据加载失败：${err.message}（已显示模拟数据）`
    // 失败时 loadKlines 内部已回退到 mock 数据
  } finally {
    loading.value = false
  }

  // 加载实时行情（失败不阻塞主流程）
  priceLoading.value = true
  try {
    const ticker = await loadTicker(currentSource.value)
    currentPrice.value = ticker.price
    priceChange.value = ticker.changePercent
  } catch (err) {
    console.warn('行情加载失败:', err)
    // 回退：用最后一根 K 线计算
    const d = klinesData.value
    if (d.length >= 2) {
      currentPrice.value = d[d.length - 1].close
      const prev = d[d.length - 2].close
      priceChange.value = prev > 0 ? ((currentPrice.value - prev) / prev) * 100 : 0
    }
    if (!errorMsg.value) errorMsg.value = '实时行情获取失败，显示K线收盘价'
  } finally {
    priceLoading.value = false
  }
}

// 切换数据源
const switchSource = (key) => {
  if (key === currentSource.value || loading.value) return
  currentSource.value = key
}

// ===== 监听 =====
watch(currentPeriod, () => nextTick(() => updateCharts()))
watch(currentIndicator, () => nextTick(() => updateSubChart()))
watch(currentSource, () => loadAll())

// ===== 格式化 =====
const formatNumber = (num) => {
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return num.toFixed(2)
}

const formatIndicatorValue = (value) => {
  if (Math.abs(value) >= 10) return value.toFixed(2)
  if (Math.abs(value) >= 1) return value.toFixed(3)
  return value.toFixed(5)
}

const getValueColor = (value) => {
  if (currentIndicator.value === 'mvrv') {
    return value < 1.5 ? 'text-green-500' : value > 3 ? 'text-red-500' : 'text-btc-orange'
  } else if (currentIndicator.value === 'nupl') {
    return value < 0 ? 'text-green-500' : value > 0.5 ? 'text-red-500' : 'text-btc-orange'
  } else if (currentIndicator.value === 'puell') {
    return value < 1 ? 'text-green-500' : value > 3 ? 'text-red-500' : 'text-btc-orange'
  } else if (currentIndicator.value === 'reserveRisk') {
    return value < 0.005 ? 'text-green-500' : value > 0.015 ? 'text-red-500' : 'text-btc-orange'
  }
  return 'text-white'
}

// ===== 响应式 resize =====
let resizeHandler = null

onMounted(async () => {
  await nextTick()
  initCharts()
  await loadAll()

  resizeHandler = () => {
    if (mainChartRef.value) mainChart?.resize(mainChartRef.value.clientWidth, 400)
    if (subChartRef.value) subChart?.resize(subChartRef.value.clientWidth, 300)
  }
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  mainChart?.remove()
  subChart?.remove()
})
</script>
