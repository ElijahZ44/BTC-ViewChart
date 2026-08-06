// Binance 行情 API 数据源（提供 BTCUSDT 真实 K 线与 24h 行情）
// 文档: https://binance-docs.github.io/apidocs/spot/en/
// 注意：浏览器直连会被 CORS 拦截，必须通过 Vite 代理 /binance-api 转发

const BINANCE_BASE = '/binance-api'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 拉取 Binance 日线 K 线（自动翻页，单页上限 1000 根）
 * @param {string} symbol 交易对，例如 BTCUSDT
 * @param {string} interval K线周期，例如 1d
 * @param {number} startTime 起始时间（毫秒）
 * @param {number} endTime 结束时间（毫秒）
 * @returns {Promise<Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>>}
 */
export async function fetchBinanceKlines(
  symbol = 'BTCUSDT',
  interval = '1d',
  startTime,
  endTime
) {
  const all = []
  let currentStart = startTime
  const limit = 1000

  // 最多翻 20 页，作为安全上限，避免死循环
  for (let page = 0; page < 20; page++) {
    const url =
      `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}` +
      `&startTime=${currentStart}&endTime=${endTime}&limit=${limit}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Binance klines 请求失败: ${res.status} ${res.statusText}`)
    }
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) break

    // Binance 返回: [openTime(ms), open, high, low, close, volume, closeTime(ms), ...]
    for (const row of rows) {
      all.push({
        time: Math.floor(row[0] / 1000), // 转秒级 Unix 时间戳
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5])
      })
    }

    // 下一页从最后一根 K 线收盘时间之后开始
    const lastCloseTime = rows[rows.length - 1][6]
    currentStart = lastCloseTime + 1

    // 不足一页说明已到尾部
    if (rows.length < limit) break
    // 控制请求速率，避免触发 IP 权重限制
    await sleep(150)
  }

  // 按时间升序（Binance 默认升序，这里做防御性排序）
  all.sort((a, b) => a.time - b.time)
  return all
}

/**
 * 获取 Binance 24h 行情（实时价格 + 24h 涨跌幅）
 * @param {string} symbol 交易对
 * @returns {Promise<{price:number, changePercent:number}>}
 */
export async function fetchBinanceTicker(symbol = 'BTCUSDT') {
  const url = `${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Binance ticker 请求失败: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return {
    price: parseFloat(data.lastPrice),
    changePercent: parseFloat(data.priceChangePercent)
  }
}
