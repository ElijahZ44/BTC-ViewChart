// 链上估值指标数据
// 数据格式: { time: Unix时间戳, value: 指标值 }
// 注：这是基于历史价格推导出的近似值，真实数据应从链上分析平台获取

const generateIndicatorData = (generator) => {
  const data = []
  const startDate = new Date('2020-01-01')
  const endDate = new Date('2024-06-01')
  let currentDate = new Date(startDate)
  let lastValue = generator.initValue
  let pointIndex = 1
  
  while (currentDate <= endDate) {
    const time = Math.floor(currentDate.getTime() / 1000)
    const dateStr = currentDate.toISOString().split('T')[0]
    
    // 检查关键点
    if (pointIndex < generator.points.length && dateStr === generator.points[pointIndex].date) {
      lastValue = generator.points[pointIndex].value
      pointIndex++
    }
    
    // 添加随机波动
    const noise = (Math.random() - 0.5) * generator.volatility
    const trend = (generator.points[Math.min(pointIndex, generator.points.length - 1)].value - lastValue) * 0.02
    const value = lastValue + noise + trend
    
    data.push({
      time,
      value: parseFloat(value.toFixed(4))
    })
    
    lastValue = value
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return data
}

// MVRV 比率: 市值/实现市值
// < 1.0 = 抄底区域, 1-3.5 = 正常, > 3.5 = 逃顶区域
const mvrvGenerator = {
  initValue: 0.8,
  volatility: 0.05,
  points: [
    { date: '2020-01-01', value: 0.8 },
    { date: '2020-03-13', value: 0.5 },
    { date: '2020-12-31', value: 1.8 },
    { date: '2021-04-14', value: 3.9 },
    { date: '2021-07-20', value: 1.8 },
    { date: '2021-11-10', value: 3.8 },
    { date: '2022-06-18', value: 1.1 },
    { date: '2022-12-30', value: 0.9 },
    { date: '2023-07-13', value: 1.5 },
    { date: '2024-03-14', value: 2.8 },
    { date: '2024-06-01', value: 2.3 },
  ]
}

// NUPL 净未实现盈亏: (市值 - 实现市值) / 市值
// < 0 = 亏损状态, 0-0.75 = 正常, > 0.75 = 贪婪
const nuplGenerator = {
  initValue: 0.05,
  volatility: 0.02,
  points: [
    { date: '2020-01-01', value: 0.05 },
    { date: '2020-03-13', value: -0.35 },
    { date: '2020-12-31', value: 0.45 },
    { date: '2021-04-14', value: 0.74 },
    { date: '2021-07-20', value: 0.35 },
    { date: '2021-11-10', value: 0.74 },
    { date: '2022-06-18', value: 0.1 },
    { date: '2022-12-30', value: -0.12 },
    { date: '2023-07-13', value: 0.33 },
    { date: '2024-03-14', value: 0.64 },
    { date: '2024-06-01', value: 0.57 },
  ]
}

// Puell Multiple: 矿工每日收益 / 一年均线
// < 0.5 = 抄底区域, 0.5-4 = 正常, > 4 = 逃顶区域
const puellGenerator = {
  initValue: 1.2,
  volatility: 0.1,
  points: [
    { date: '2020-01-01', value: 1.2 },
    { date: '2020-03-13', value: 0.45 },
    { date: '2020-05-12', value: 0.6 },
    { date: '2020-12-31', value: 3.5 },
    { date: '2021-04-14', value: 4.2 },
    { date: '2021-07-20', value: 1.8 },
    { date: '2021-11-10', value: 4.3 },
    { date: '2022-06-18', value: 0.85 },
    { date: '2022-12-30', value: 1.0 },
    { date: '2023-07-13', value: 2.2 },
    { date: '2024-03-14', value: 3.4 },
    { date: '2024-06-01', value: 2.8 },
  ]
}

// Reserve Risk 储备风险: 用于持有BTC的机会成本
// < 0.002 = 抄底区域, 0.002-0.02 = 正常, > 0.02 = 逃顶区域
const reserveRiskGenerator = {
  initValue: 0.0015,
  volatility: 0.00015,
  points: [
    { date: '2020-01-01', value: 0.0015 },
    { date: '2020-03-13', value: 0.0008 },
    { date: '2020-12-31', value: 0.008 },
    { date: '2021-04-14', value: 0.019 },
    { date: '2021-07-20', value: 0.008 },
    { date: '2021-11-10', value: 0.02 },
    { date: '2022-06-18', value: 0.0025 },
    { date: '2022-12-30', value: 0.0018 },
    { date: '2023-07-13', value: 0.005 },
    { date: '2024-03-14', value: 0.014 },
    { date: '2024-06-01', value: 0.01 },
  ]
}

export const mvrvData = generateIndicatorData(mvrvGenerator)
export const nuplData = generateIndicatorData(nuplGenerator)
export const puellData = generateIndicatorData(puellGenerator)
export const reserveRiskData = generateIndicatorData(reserveRiskGenerator)
