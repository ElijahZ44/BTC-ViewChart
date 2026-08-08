// Alternative.me 恐惧贪婪指数 API
// 实时情绪指标（2011年至今的历史数据）
// 文档: https://alternative.me/crypto/fear-and-greed-index/
// 分类: Extreme Fear(0-24), Fear(25-49), Neutral(50), Greed(51-74), Extreme Greed(75-100)
// 注意：免费版历史数据有限（约2000条，2年左右）

const ALTME_BASE = '/alt-me'

/**
 * 获取恐惧贪婪指数历史数据
 * @param {number} limit 获取条数（最大 2000）
 * @returns {Promise<Array<{time:number, value:number, classification:string}>>}
 */
export async function fetchFearGreed(limit = 2000) {
  const url = `${ALTME_BASE}/fng/?limit=${limit}&format=json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Alternative.me fng 请求失败: ${res.status}`)
  }
  const data = await res.json()
  const values = data.data || []
  if (values.length === 0) {
    throw new Error('Alternative.me 未返回任何数据')
  }
  // 返回的是降序，转升序
  return values
    .map((v) => ({
      time: parseInt(v.timestamp, 10),
      value: parseInt(v.value, 10),
      classification: v.value_classification
    }))
    .sort((a, b) => a.time - b.time)
}

/**
 * 获取最新的恐惧贪婪指数
 */
export async function fetchLatestFearGreed() {
  const data = await fetchFearGreed(1)
  if (data.length === 0) {
    throw new Error('恐惧贪婪指数无数据')
  }
  return data[data.length - 1]
}
