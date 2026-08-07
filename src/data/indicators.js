// 链上估值指标数据
// 数据格式: { time: Unix时间戳, value: 指标值 }
// 注：这是基于历史价格推导出的近似值，真实数据应从链上分析平台获取

// 使用 UTC 0 点的秒级时间戳，与真实交易所 K 线（Binance/Coinbase/CoinGecko）对齐
// 避免本地时区导致主副图垂直错位

const generateIndicatorData = (generator) => {
  const data = []
  // 从 2013-04-28 开始（CoinGecko 最早数据日期），与价格数据范围对齐
  const startMs = Date.UTC(2013, 3, 28)
  // 到当前日期
  const endMs = Date.now()
  const dayMs = 86400000
  let lastValue = generator.initValue
  let pointIndex = 1

  for (let offset = 0; startMs + offset * dayMs <= endMs; offset++) {
    const currentMs = startMs + offset * dayMs
    const time = Math.floor(currentMs / 1000)
    const dateStr = new Date(currentMs).toISOString().split('T')[0]

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
  }

  return data
}

// MVRV 比率: 市值/实现市值
// < 1.0 = 抄底区域, 1-3.5 = 正常, > 3.5 = 逃顶区域
const mvrvGenerator = {
  initValue: 1.5,
  volatility: 0.05,
  points: [
    // 2013-2020 早期历史关键点
    { date: '2013-04-28', value: 1.5 },
    { date: '2013-12-04', value: 3.8 },    // 2013年顶部
    { date: '2014-04-10', value: 2.0 },
    { date: '2015-01-14', value: 0.7 },    // 2015年底部
    { date: '2015-10-01', value: 1.2 },
    { date: '2016-06-01', value: 1.5 },
    { date: '2017-01-01', value: 1.8 },
    { date: '2017-06-12', value: 3.0 },
    { date: '2017-12-17', value: 4.4 },    // 2017年牛市顶部
    { date: '2018-02-06', value: 2.0 },
    { date: '2018-12-15', value: 0.7 },    // 2018年熊市底部
    { date: '2019-06-26', value: 2.7 },
    { date: '2019-12-01', value: 1.5 },
    // 2020年至今
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
    { date: '2025-01-20', value: 3.2 },
    { date: '2025-08-01', value: 2.0 },
    { date: '2026-08-01', value: 2.2 },
  ]
}

// NUPL 净未实现盈亏: (市值 - 实现市值) / 市值
// < 0 = 亏损状态, 0-0.75 = 正常, > 0.75 = 贪婪
const nuplGenerator = {
  initValue: 0.3,
  volatility: 0.02,
  points: [
    // 2013-2020 早期历史关键点
    { date: '2013-04-28', value: 0.3 },
    { date: '2013-12-04', value: 0.75 },
    { date: '2014-04-10', value: 0.3 },
    { date: '2015-01-14', value: -0.15 },
    { date: '2015-10-01', value: 0.1 },
    { date: '2016-06-01', value: 0.2 },
    { date: '2017-01-01', value: 0.3 },
    { date: '2017-06-12', value: 0.6 },
    { date: '2017-12-17', value: 0.8 },
    { date: '2018-02-06', value: 0.3 },
    { date: '2018-12-15', value: -0.2 },
    { date: '2019-06-26', value: 0.5 },
    { date: '2019-12-01', value: 0.2 },
    // 2020年至今
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
    { date: '2025-01-20', value: 0.7 },
    { date: '2025-08-01', value: 0.4 },
    { date: '2026-08-01', value: 0.5 },
  ]
}

// Puell Multiple: 矿工每日收益 / 一年均线
// < 0.5 = 抄底区域, 0.5-4 = 正常, > 4 = 逃顶区域
const puellGenerator = {
  initValue: 1.5,
  volatility: 0.1,
  points: [
    // 2013-2020 早期历史关键点
    { date: '2013-04-28', value: 1.5 },
    { date: '2013-12-04', value: 3.5 },
    { date: '2014-04-10', value: 2.0 },
    { date: '2015-01-14', value: 0.4 },
    { date: '2015-10-01', value: 1.5 },
    { date: '2016-06-01', value: 1.2 },
    { date: '2017-01-01', value: 1.0 },
    { date: '2017-06-12', value: 2.5 },
    { date: '2017-12-17', value: 4.5 },
    { date: '2018-02-06', value: 2.0 },
    { date: '2018-12-15', value: 0.5 },
    { date: '2019-06-26', value: 2.0 },
    { date: '2019-12-01', value: 1.2 },
    // 2020年至今
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
    { date: '2025-01-20', value: 3.8 },
    { date: '2025-08-01', value: 2.0 },
    { date: '2026-08-01', value: 2.5 },
  ]
}

// Reserve Risk 储备风险: 用于持有BTC的机会成本
// < 0.002 = 抄底区域, 0.002-0.02 = 正常, > 0.02 = 逃顶区域
const reserveRiskGenerator = {
  initValue: 0.002,
  volatility: 0.00015,
  points: [
    // 2013-2020 早期历史关键点
    { date: '2013-04-28', value: 0.002 },
    { date: '2013-12-04', value: 0.015 },
    { date: '2014-04-10', value: 0.005 },
    { date: '2015-01-14', value: 0.0008 },
    { date: '2015-10-01', value: 0.002 },
    { date: '2016-06-01', value: 0.003 },
    { date: '2017-01-01', value: 0.004 },
    { date: '2017-06-12', value: 0.01 },
    { date: '2017-12-17', value: 0.025 },
    { date: '2018-02-06', value: 0.008 },
    { date: '2018-12-15', value: 0.0008 },
    { date: '2019-06-26', value: 0.007 },
    { date: '2019-12-01', value: 0.003 },
    // 2020年至今
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
    { date: '2025-01-20', value: 0.016 },
    { date: '2025-08-01', value: 0.006 },
    { date: '2026-08-01', value: 0.008 },
  ]
}

export const mvrvData = generateIndicatorData(mvrvGenerator)
export const nuplData = generateIndicatorData(nuplGenerator)
export const puellData = generateIndicatorData(puellGenerator)
export const reserveRiskData = generateIndicatorData(reserveRiskGenerator)
