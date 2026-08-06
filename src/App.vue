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
              ${{ formatNumber(currentPrice) }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-400">24h涨跌</div>
            <div class="text-lg font-bold" :class="priceChange >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ priceChange >= 0 ? '+' : '' }}{{ priceChange.toFixed(2) }}%
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="max-w-7xl mx-auto p-6">
      <!-- 时间周期选择 -->
      <div class="flex items-center gap-2 mb-4">
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

      <!-- K线主图 -->
      <div class="bg-btc-card rounded-lg border border-btc-border p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">BTC/USD K线走势</h2>
          <span class="text-sm text-gray-400">每日收盘价格</span>
        </div>
        <div ref="mainChartRef" class="w-full" style="height: 400px;"></div>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts'
import { priceData } from './data/price.js'
import { mvrvData, nuplData, puellData, reserveRiskData } from './data/indicators.js'

// 响应式数据
const mainChartRef = ref(null)
const subChartRef = ref(null)
let mainChart = null
let subChart = null
let mainSeries = null
let subSeries = null

const currentPeriod = ref('1y')
const currentIndicator = ref('mvrv')
const currentPrice = ref(0)
const priceChange = ref(0)

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
  const current = data[data.length - 1]?.value || 0
  return {
    ...info,
    current
  }
})

// 过滤时间周期数据
const filteredPriceData = computed(() => {
  const data = [...priceData]
  if (currentPeriod.value === 'all') return data
  const now = data[data.length - 1].time
  const months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 }
  const cutoffTime = now - months[currentPeriod.value] * 30 * 24 * 3600
  return data.filter(d => d.time >= cutoffTime)
})

const filteredIndicatorData = computed(() => {
  const data = [...indicatorInfo[currentIndicator.value].data]
  if (currentPeriod.value === 'all') return data
  const now = data[data.length - 1].time
  const months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 }
  const cutoffTime = now - months[currentPeriod.value] * 30 * 24 * 3600
  return data.filter(d => d.time >= cutoffTime)
})

// 初始化图表
const initCharts = () => {
  if (!mainChartRef.value || !subChartRef.value) return

  // 主图配置
  mainChart = createChart(mainChartRef.value, {
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
    rightPriceScale: {
      borderColor: '#30363D',
    },
    timeScale: {
      borderColor: '#30363D',
      timeVisible: false,
    },
  })

  mainSeries = mainChart.addCandlestickSeries({
    upColor: '#26A69A',
    downColor: '#EF5350',
    borderUpColor: '#26A69A',
    borderDownColor: '#EF5350',
    wickUpColor: '#26A69A',
    wickDownColor: '#EF5350',
  })

  // 副图配置
  subChart = createChart(subChartRef.value, {
    layout: {
      background: { type: 'solid', color: '#0D1117' },
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
    rightPriceScale: {
      borderColor: '#30363D',
    },
    timeScale: {
      borderColor: '#30363D',
      timeVisible: false,
    },
  })

  subSeries = subChart.addAreaSeries({
    lineColor: '#F7931A',
    topColor: 'rgba(247, 147, 26, 0.4)',
    bottomColor: 'rgba(247, 147, 26, 0.05)',
    lineWidth: 2,
  })
}

// 更新图表数据
const updateCharts = () => {
  if (!mainSeries || !subSeries) return

  // 主图数据
  mainSeries.setData(filteredPriceData.value)
  mainChart.timeScale().fitContent()

  // 副图数据
  const indicatorData = filteredIndicatorData.value.map(d => ({
    time: d.time,
    value: d.value
  }))
  subSeries.setData(indicatorData)
  subChart.timeScale().fitContent()

  // 同步时间轴
  mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (range) {
      subChart.timeScale().setVisibleLogicalRange(range)
    }
  })
}

// 监听数据变化
watch([currentPeriod, currentIndicator], () => {
  nextTick(() => updateCharts())
})

// 格式化数字
const formatNumber = (num) => {
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  return num.toFixed(2)
}

const formatIndicatorValue = (value) => {
  if (Math.abs(value) >= 10) {
    return value.toFixed(2)
  } else if (Math.abs(value) >= 1) {
    return value.toFixed(3)
  } else {
    return value.toFixed(5)
  }
}

const getValueColor = (value) => {
  // 根据指标值返回颜色
  const info = indicatorInfo[currentIndicator.value]
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

onMounted(async () => {
  await nextTick()
  initCharts()
  updateCharts()

  // 更新价格信息
  const data = filteredPriceData.value
  if (data.length >= 2) {
    currentPrice.value = data[data.length - 1].close
    const prevClose = data[data.length - 2].close
    priceChange.value = ((currentPrice.value - prevClose) / prevClose) * 100
  }

  // 响应式处理
  const handleResize = () => {
    mainChart?.resize(mainChartRef.value.clientWidth, 400)
    subChart?.resize(subChartRef.value.clientWidth, 300)
  }
  window.addEventListener('resize', handleResize)
})
</script>
