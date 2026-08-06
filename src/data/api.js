// 统一数据访问层：封装两个真实数据源（BTCUSDT / BTCUSD）的切换、本地缓存与失败回退
// 数据源（均走 Binance 公共数据镜像 data-api.binance.vision）：
//   - BTCUSDT → Binance BTC/USDT
//   - BTCUSD  → Binance BTC/USDC（近似美元价格）

import { fetchBinanceKlines, fetchBinanceTicker } from './binance.js'
import { priceData as mockPriceData } from './price.js'
// Coinbase 数据源（BTC-USD）当前网络不可达，保留模块备用
// 如需启用，导入 coinbase.js 并将 BTCUSD 数据源切换为 fetchCoinbaseKlines

// 数据源定义
// 两个数据源均使用 Binance 公共数据镜像（data-api.binance.vision），国内访问稳定
//   - BTCUSDT: 泰达币（USDT）计价
//   - BTCUSD : 美元稳定币（USDC）计价，近似美元价格
// 注：真正的 Coinbase BTC-USD 在部分网络环境下不可达，若需切换可改回 fetchCoinbaseKlines
export const DATA_SOURCES = {
  BTCUSDT: {
    key: 'BTCUSDT',
    label: 'BTC/USDT',
    source: 'Binance',
    // 从 2020-01-01 拉取至今，覆盖完整牛熊周期，与链上指标数据范围对齐
    startTime: new Date('2020-01-01').getTime(),
    fetchKlines: (start, end) => fetchBinanceKlines('BTCUSDT', '1d', start, end),
    fetchTicker: () => fetchBinanceTicker('BTCUSDT')
  },
  BTCUSD: {
    key: 'BTCUSD',
    label: 'BTC/USD',
    source: 'Binance (USDC)',
    startTime: new Date('2020-01-01').getTime(),
    fetchKlines: (start, end) => fetchBinanceKlines('BTCUSDC', '1d', start, end),
    fetchTicker: () => fetchBinanceTicker('BTCUSDC')
  }
}

// 缓存配置
const CACHE_PREFIX = 'btc_klines_'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 小时

/**
 * 读取本地缓存的 K 线数据
 */
function readCache(sourceKey) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + sourceKey)
    if (!raw) return null
    const { timestamp, data } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL) return null
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
      // 后台刷新失败：若有缓存则静默忽略；若首次加载则抛出由调用方处理
      if (!hasCache) throw err
      console.warn(`[${sourceKey}] 后台刷新失败，继续使用缓存:`, err)
    }
    return cached
  }

  if (hasCache) {
    // 有缓存：立即返回缓存，后台静默刷新
    refresh()
    return cached
  }

  // 无缓存：必须等待首次拉取
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
