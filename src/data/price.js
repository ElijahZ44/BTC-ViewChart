// BTC 历史K线模拟数据（2013年4月至今）
// 数据格式: { time: Unix时间戳, open, high, low, close }
// 注：这是模拟数据用于演示和回退，实际使用时应接入API获取真实数据
// 当真实数据源（Binance/Coinbase/CoinGecko）可用时，不会使用此数据

const generatePriceData = () => {
  const data = []
  // 从 2013-04-28 开始（CoinGecko 最早数据日期）
  const startMs = Date.UTC(2013, 3, 28)
  // 到当前日期
  const endMs = Date.now()
  const dayMs = 86400000

  // 关键价格节点（基于真实BTC历史走势）
  const pricePoints = [
    // 2013-2020 早期历史
    { date: '2013-04-28', price: 120 },
    { date: '2013-12-04', price: 1100 },    // 2013年顶部
    { date: '2014-04-10', price: 450 },
    { date: '2015-01-14', price: 170 },     // 2015年底部
    { date: '2015-10-01', price: 280 },
    { date: '2016-06-01', price: 700 },
    { date: '2017-01-01', price: 1000 },
    { date: '2017-06-12', price: 2900 },
    { date: '2017-12-17', price: 19500 },   // 2017年牛市顶部
    { date: '2018-02-06', price: 7000 },
    { date: '2018-12-15', price: 3200 },    // 2018年熊市底部
    { date: '2019-06-26', price: 12000 },
    { date: '2019-12-01', price: 7200 },
    // 2020年至今
    { date: '2020-01-01', price: 7200 },
    { date: '2020-03-13', price: 3800 },    // 312暴跌
    { date: '2020-05-12', price: 8900 },
    { date: '2020-07-26', price: 10900 },
    { date: '2020-12-31', price: 28900 },
    { date: '2021-01-08', price: 41900 },
    { date: '2021-02-22', price: 57500 },
    { date: '2021-04-14', price: 64000 },
    { date: '2021-07-20', price: 29800 },
    { date: '2021-11-10', price: 69000 },   // 历史最高点
    { date: '2022-01-24', price: 34800 },
    { date: '2022-06-18', price: 18900 },   // 熊市低点
    { date: '2022-12-30', price: 16500 },
    { date: '2023-03-14', price: 24300 },
    { date: '2023-07-13', price: 30500 },
    { date: '2023-10-23', price: 26700 },
    { date: '2024-01-11', price: 48900 },
    { date: '2024-03-14', price: 73800 },   // 新高
    { date: '2024-04-13', price: 63000 },
    { date: '2024-06-01', price: 67800 },
    { date: '2025-01-20', price: 102000 },
    { date: '2025-08-01', price: 68000 },
    { date: '2026-08-01', price: 64000 },
  ]

  // 填充中间数据点
  let lastPrice = pricePoints[0].price
  let pointIndex = 1

  for (let offset = 0; startMs + offset * dayMs <= endMs; offset++) {
    const currentMs = startMs + offset * dayMs
    const time = Math.floor(currentMs / 1000)
    const dateStr = new Date(currentMs).toISOString().split('T')[0]

    // 检查是否到达关键节点
    if (pointIndex < pricePoints.length && dateStr === pricePoints[pointIndex].date) {
      lastPrice = pricePoints[pointIndex].price
      pointIndex++
    }

    // 生成每日K线
    const volatility = lastPrice * 0.03 // 3% 波动率
    const trend = (pricePoints[Math.min(pointIndex, pricePoints.length - 1)].price - lastPrice) * 0.02
    const change = (Math.random() - 0.5) * volatility + trend
    const close = Math.max(1, lastPrice + change)
    const open = lastPrice
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5

    data.push({
      time,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(Math.max(1, low)),
      close: Math.round(close)
    })

    lastPrice = close
  }

  return data
}

export const priceData = generatePriceData()
