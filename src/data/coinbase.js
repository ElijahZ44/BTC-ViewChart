// Coinbase 公开市场数据 API（提供 BTCUSD 真实 K 线与行情）
// 文档: https://docs.cdp.coinbase.com/exchange/reference/
// 公开端点无需鉴权，单次 candles 上限 300 根，需翻页

const COINBASE_BASE = '/coinbase-api'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 拉取 Coinbase 日线 K 线（自动翻页，单页上限 300 根）
 * @param {string} productId 产品 ID，例如 BTC-USD
 * @param {number} startTime 起始时间（毫秒）
 * @param {number} endTime 结束时间（毫秒）
 * @returns {Promise<Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>>}
 */
export async function fetchCoinbaseKlines(
  productId = 'BTC-USD',
  startTime,
  endTime
) {
  const all = []
  const granularity = 'ONE_DAY'
  // 单页最多 300 根日线 => 300 天
  const segmentMs = 300 * 24 * 3600 * 1000
  let currentStart = startTime
  const end = endTime

  for (let page = 0; page < 30; page++) {
    const segEnd = Math.min(currentStart + segmentMs, end)
    const url =
      `${COINBASE_BASE}/api/v3/brokerage/market/products/${productId}/candles` +
      `?granularity=${granularity}&start=${new Date(currentStart).toISOString()}` +
      `&end=${new Date(segEnd).toISOString()}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Coinbase klines 请求失败: ${res.status} ${res.statusText}`)
    }
    const json = await res.json()
    const candles = json.candles || []
    if (candles.length === 0) {
      currentStart = segEnd + 1
      if (currentStart >= end) break
      await sleep(200)
      continue
    }

    // Coinbase 返回: [start(s), low, high, open, close, volume]（注意 low 在 high 前）
    for (const row of candles) {
      all.push({
        time: parseInt(row[0], 10), // 已是秒级 Unix 时间戳
        open: parseFloat(row[3]),
        high: parseFloat(row[2]),
        low: parseFloat(row[1]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5])
      })
    }

    currentStart = segEnd + 1
    if (currentStart >= end) break
    // Coinbase 返回的 candles 是倒序，不足 300 根说明该段已到尾部
    if (candles.length < 300) {
      // 但时间段可能还没结束（数据稀疏），继续下一段
    }
    await sleep(200)
  }

  // Coinbase 返回倒序，统一升序；同时去重（按 time）
  all.sort((a, b) => a.time - b.time)
  const dedup = []
  for (const item of all) {
    if (dedup.length === 0 || dedup[dedup.length - 1].time !== item.time) {
      dedup.push(item)
    }
  }
  return dedup
}

/**
 * 获取 Coinbase 当前行情
 * Coinbase ticker 不直接提供 24h 涨跌幅，这里取最近 2 根日线计算
 * @param {string} productId 产品 ID
 * @returns {Promise<{price:number, changePercent:number}>}
 */
export async function fetchCoinbaseTicker(productId = 'BTC-USD') {
  // 取最近 3 天日线，用最后一根 close 作为当前价，前一根 close 计算 24h 涨跌
  const endTime = Date.now()
  const startTime = endTime - 3 * 24 * 3600 * 1000
  const klines = await fetchCoinbaseKlines(productId, startTime, endTime)

  if (klines.length >= 2) {
    const last = klines[klines.length - 1]
    const prev = klines[klines.length - 2]
    const changePercent =
      prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0
    return { price: last.close, changePercent }
  }
  if (klines.length === 1) {
    return { price: klines[0].close, changePercent: 0 }
  }

  // 兜底：尝试 ticker 端点
  const url = `${COINBASE_BASE}/api/v3/brokerage/market/products/${productId}/ticker`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Coinbase ticker 请求失败: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return {
    price: parseFloat(data.price || 0),
    changePercent: 0
  }
}
