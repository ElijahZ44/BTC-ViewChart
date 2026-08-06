// BTC 历史K线数据 (2020年1月 - 2024年6月)
// 数据格式: { time: Unix时间戳, open, high, low, close }
// 注：这是模拟数据用于演示，实际使用时应接入API获取真实数据

const generatePriceData = () => {
  const data = []
  const startDate = new Date('2020-01-01')
  const endDate = new Date('2024-06-01')
  
  // 关键价格节点（模拟真实走势）
  const pricePoints = [
    { date: '2020-01-01', price: 7200 },
    { date: '2020-03-13', price: 3800 },   // 312暴跌
    { date: '2020-05-12', price: 8900 },
    { date: '2020-07-26', price: 10900 },
    { date: '2020-12-31', price: 28900 },
    { date: '2021-01-08', price: 41900 },   // 历史高点
    { date: '2021-02-22', price: 57500 },
    { date: '2021-04-14', price: 64000 },   // 前高
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
  ]

  // 填充中间数据点
  const currentDate = new Date(startDate)
  let lastPrice = 7200
  let pointIndex = 1
  
  while (currentDate <= endDate) {
    const time = Math.floor(currentDate.getTime() / 1000)
    const dateStr = currentDate.toISOString().split('T')[0]
    
    // 检查是否到达关键节点
    if (pointIndex < pricePoints.length && dateStr === pricePoints[pointIndex].date) {
      lastPrice = pricePoints[pointIndex].price
      pointIndex++
    }
    
    // 生成每日K线
    const volatility = lastPrice * 0.03 // 3% 波动率
    const trend = (pricePoints[Math.min(pointIndex, pricePoints.length - 1)].price - lastPrice) * 0.02
    const change = (Math.random() - 0.5) * volatility + trend
    const close = Math.max(100, lastPrice + change)
    const open = lastPrice
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    
    data.push({
      time,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(Math.max(100, low)),
      close: Math.round(close)
    })
    
    lastPrice = close
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return data
}

export const priceData = generatePriceData()
