// 统一数据访问层：封装多个真实数据源的切换、本地缓存与失败回退
// 数据源：
//   - BTCUSDT  → Binance BTC/USDT（最早 2017-08-17，国内直连可用）
//   - BTCUSD   → Coinbase BTC/USD（最早 2015-07-20，需挂 VPN）
//   - BTCUSD_CG→ CoinGecko BTC/USD（最早 2013-04-28，需挂 VPN，仅有收盘价）

import { fetchBinanceKlines, fetchBinanceTicker } from './binance.js'
import { fetchCoinbaseKlines, fetchCoinbaseTicker } from './coinbase.js'
import { fetchCoinGeckoKlines, fetchCoinGeckoTicker } from './coingecko.js'
import { priceData as mockPriceData } from './price.js'

// 数据源定义
// startTime 设为 2010-01-01（BTC 诞生初期），各数据源 API 会自动从各自最早可用日期返回数据
// coverage 字段用于 UI 显示数据覆盖范围
export const DATA_SOURCES = {
  BTCUSDT: {
    key: 'BTCUSDT',
    label: 'BTC/USDT',
    source: 'Binance',
    coverage: '2017年8月至今',
    startTime: Date.UTC(2010, 0, 1),
    fetchKlines: (start, end) => fetchBinanceKlines('BTCUSDT', '1d', start, end),
    fetchTicker: () => fetchBinanceTicker('BTCUSDT')
  },
  BTCUSD: {
    key: 'BTCUSD',
    label: 'BTC/USD',
    source: 'Coinbase',
    coverage: '2015年7月至今（需VPN）',
    startTime: Date.UTC(2010, 0, 1),
    fetchKlines: (start, end) => fetchCoinbaseKlines('BTC-USD', start, end),
    fetchTicker: () => fetchCoinbaseTicker('BTC-USD')
  },
  BTCUSD_CG: {
    key: 'BTCUSD_CG',
    label: 'BTC/USD 早期',
    source: 'CoinGecko',
    coverage: '2013年4月至今（需VPN）',
    // CoinGecko 最早数据约 2013-04-28
    startTime: Date.UTC(2013, 3, 28),
    fetchKlines: (start, end) => fetchCoinGeckoKlines(start, end),
    fetchTicker: () => fetchCoinGeckoTicker(),
    note: 'CoinGecko 数据仅有收盘价，OHLC 为近似值（无影线）'
  }
}

// 缓存配置
// CoinGecko 拉取较慢（分段请求），缓存时间延长到 24 小时
const CACHE_PREFIX = 'btc_klines_'
const CACHE_TTL_DEFAULT = 6 * 60 * 60 * 1000 // 6 小时
const CACHE_TTL_COINGECKO = 24 * 60 * 60 * 1000 // 24 小时

function getCacheTtl(sourceKey) {
  return sourceKey === 'BTCUSD_CG' ? CACHE_TTL_COINGECKO : CACHE_TTL_DEFAULT
}

/**
 * 读取本地缓存的 K 线数据
 */
function readCache(sourceKey) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + sourceKey)
    if (!raw) return null
    const { timestamp, data } = JSON.parse(raw)
    if (Date.now() - timestamp > getCacheTtl(sourceKey)) return null
    if (!Array.isArray(data) || data.length === 0) return null
    return data
  } catch {
    return null
  }
}

/**
 * 写入本地缓存
 */
function writeCache(sourceKey, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + sourceKey,
      JSON.stringify({ timestamp: Date.now(), data })
    )
  } catch {
    // localStorage 满或不可用，忽略
  }
}

/**
 * 加载指定数据源的 K 线（带缓存优先 + 后台刷新）
 * @param {string} sourceKey 数据源 key
 * @param {(loaded:any)=>void} onRefreshed 后台拉取到最新数据后的回调
 * @returns {Promise<Array>} K 线数组（失败时回退到 mock 数据）
 */
export async function loadKlines(sourceKey, onRefreshed) {
  const source = DATA_SOURCES[sourceKey]
  if (!source) throw new Error(`未知数据源: ${sourceKey}`)

  const endTime = Date.now()

  // 1) 优先用缓存快速渲染
  const cached = readCache(sourceKey)
  const hasCache = cached !== null

  // 2) 后台拉取最新数据
  const refresh = async () => {
    try {
      const fresh = await source.fetchKlines(source.startTime, endTime)
      if (fresh && fresh.length > 0) {
        writeCache(sourceKey, fresh)
        onRefreshed && onRefreshed(fresh)
        return fresh
      }
    } catch (err) {
      // 拉取失败：若有缓存则静默忽略；若无缓存则返回 null，由调用方回退到 mock 数据
      if (!hasCache) {
        console.warn(`[${sourceKey}] 首次加载失败，将回退到模拟数据:`, err)
        return null
      }
      console.warn(`[${sourceKey}] 后台刷新失败，继续使用缓存:`, err)
    }
    return cached
  }

  if (hasCache) {
    // 有缓存：立即返回缓存，后台静默刷新
    refresh()
    return cached
  }

  // 无缓存：等待首次拉取，失败时回退到 mock 数据
  const fresh = await refresh()
  return fresh || mockPriceData
}

/**
 * 获取指定数据源的实时行情
 * @param {string} sourceKey 数据源 key
 * @returns {Promise<{price:number, changePercent:number}>}
 */
export async function loadTicker(sourceKey) {
  const source = DATA_SOURCES[sourceKey]
  if (!source) throw new Error(`未知数据源: ${sourceKey}`)
  return source.fetchTicker()
}
