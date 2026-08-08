// Blockchain.info 公共链上数据 API
// 提供 BTC 市场价格（2009至今，约 1600+ 条日数据）
// 文档: https://www.blockchain.com/explorer/api/charts-api
// 无需 API key，无 CORS 限制（通过 Vite 代理访问）

const BCINFO_BASE = '/bc-info'

// 通用请求方法：添加 Accept-Language 头避免 Blockchain.info 拒绝中文请求
async function bcFetch(url) {
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'application/json'
    }
  })
  return res
}

/**
 * 获取 BTC 历史市场价格（2009至今，日粒度）
 * 返回格式: [{ time: Unix秒, price: number }]
 */
export async function fetchMarketPrice() {
  const url = `${BCINFO_BASE}/charts/market-price?timespan=all&format=json&sampled=true`
  const res = await bcFetch(url)
  if (!res.ok) {
    throw new Error(`Blockchain.info market-price 请求失败: ${res.status}`)
  }
  const data = await res.json()
  const values = data.values || []
  if (values.length === 0) {
    throw new Error('Blockchain.info 未返回任何价格数据')
  }
  return values.map((v) => ({ time: v.x, price: v.y }))
}

/**
 * 获取 BTC 历史市值（2009至今）
 * 返回格式: [{ time: Unix秒, cap: number }]
 */
export async function fetchMarketCap() {
  const url = `${BCINFO_BASE}/charts/market-cap?timespan=all&format=json&sampled=true`
  const res = await bcFetch(url)
  if (!res.ok) {
    throw new Error(`Blockchain.info market-cap 请求失败: ${res.status}`)
  }
  const data = await res.json()
  const values = data.values || []
  return values.map((v) => ({ time: v.x, cap: v.y }))
}

/**
 * 获取 BTC 历史哈希率
 * 返回格式: [{ time: Unix秒, hash: number }]
 */
export async function fetchHashRate() {
  const url = `${BCINFO_BASE}/charts/hash-rate?timespan=all&format=json&sampled=true`
  const res = await bcFetch(url)
  if (!res.ok) {
    throw new Error(`Blockchain.info hash-rate 请求失败: ${res.status}`)
  }
  const data = await res.json()
  const values = data.values || []
  return values.map((v) => ({ time: v.x, hash: v.y }))
}
