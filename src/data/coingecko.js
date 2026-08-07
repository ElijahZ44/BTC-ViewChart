// CoinGecko 公共 API 数据源（提供 BTC/USD 早期价格，覆盖 2013 年至今）
// 文档: https://docs.coingecko.com/reference/introduction
// 注：CoinGecko 免费公共 API 有速率限制（约 5-15 次/分钟），分段拉取时需控制频率
//     当前网络环境下可能不可达，用户挂 VPN 后可用

const COINGECKO_BASE = '/coingecko-api'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 拉取 CoinGecko 日线价格（分段拉取，每次 365 天，确保日粒度）
 * CoinGecko market_chart/range 在时间范围 > 90 天时自动返回日粒度数据
 * 返回的是收盘价，用收盘价模拟 OHLC（open=前日close，high/low=极值）
 *
 * @param {number} startTime 起始时间（毫秒）
 * @param {number} endTime 结束时间（毫秒）
 * @returns {Promise<Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>>}
 */
export async function fetchCoinGeckoKlines(startTime, endTime) {
  // CoinGecko 最早数据约为 2013-04-28，若 startTime 更早则从 2013-04-28 开始
  const cgEarliest = Date.UTC(2013, 3, 28)
  const start = Math.max(startTime, cgEarliest)

  const allPrices = [] // [{ time: 秒级时间戳, price }]
  const segmentMs = 365 * 24 * 3600 * 1000 // 每段拉 365 天
  let currentStart = start

  for (let page = 0; page < 30; page++) {
    const segEnd = Math.min(currentStart + segmentMs, endTime)
    const fromSec = Math.floor(currentStart / 1000)
    const toSec = Math.floor(segEnd / 1000)
    const url =
      `${COINGECKO_BASE}/api/v3/coins/bitcoin/market_chart/range` +
      `?vs_currency=usd&from=${fromSec}&to=${toSec}`

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`CoinGecko klines 请求失败: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()

    if (data.prices && Array.isArray(data.prices)) {
      for (const [tsMs, price] of data.prices) {
        allPrices.push({ time: Math.floor(tsMs / 1000), price })
      }
    }

    if (segEnd >= endTime) break
    currentStart = segEnd + 1
    // CoinGecko 免费公共 API 速率限制，每次请求间隔 1.2 秒
    await sleep(1200)
  }

  if (allPrices.length === 0) {
    throw new Error('CoinGecko 未返回任何价格数据')
  }

  // 按天聚合：一天可能有多个数据点，取最后一个作为当天收盘价
  const dailyMap = new Map()
  for (const item of allPrices) {
    // 归一化到 UTC 0 点（86400 秒 = 1 天）
    const dayTime = Math.floor(item.time / 86400) * 86400
    dailyMap.set(dayTime, item.price)
  }

  // 转换为 OHLC 格式（用收盘价模拟）
  const result = []
  const sortedTimes = [...dailyMap.keys()].sort((a, b) => a - b)
  let prevClose = null

  for (const time of sortedTimes) {
    const close = dailyMap.get(time)
    const open = prevClose !== null ? prevClose : close
    result.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(Math.max(open, close).toFixed(2)),
      low: parseFloat(Math.min(open, close).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: 0 // CoinGecko market_chart 的 volume 数据不够准确，暂不使用
    })
    prevClose = close
  }

  return result
}

/**
 * 获取 CoinGecko 当前 BTC 行情（价格 + 24h 涨跌幅）
 * 使用 simple/price 端点，轻量快速
 * @returns {Promise<{price:number, changePercent:number}>}
 */
export async function fetchCoinGeckoTicker() {
  const url =
    `${COINGECKO_BASE}/api/v3/simple/price` +
    `?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CoinGecko ticker 请求失败: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  if (!data.bitcoin) {
    throw new Error('CoinGecko ticker 返回数据格式异常')
  }
  return {
    price: parseFloat(data.bitcoin.usd),
    changePercent: parseFloat(data.bitcoin.usd_24h_change || 0)
  }
}
