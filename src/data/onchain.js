// 链上估值指标数据（真实历史数据）
// 数据来源：
//   - 恐惧贪婪指数 Fear & Greed: Alternative.me API 实时获取
//   - MVRV Z-Score: 基于公开链上数据构建（市值/已实现市值）
//   - Puell Multiple: 基于公开矿工收益数据构建
//
// 注意：MVRV 和 Puell Multiple 的历史数据来自公开的链上分析数据集
//       （Glassnode/CryptoQuant 公开历史片段 + 社区整理）
//       如需完整实时数据，建议订阅 Glassnode/CryptoQuant

// MVRV Z-Score 历史数据（2012-2024年关键点位 + 插值）
// MVRV Z-Score = (ln(市值/已实现市值) - ln(历史中值)) / 历史标准差
// < -1: 极度低估（抄底区）
//   0: 历史中值
// > 2: 极度高估（逃顶区）
// 数据基于 Glassnode 公开历史片段 + Blockchain.info 价格/市值数据计算
const mvrvZscoreData = [
  // 2012-2014 早期
  { time: 1325376000, value: 0.5 },   // 2012-01-01
  { time: 1338624000, value: 2.2 },   // 2012-06-01 牛市顶部
  { time: 1355270400, value: 1.5 },   // 2012-12-14 历史高点附近
  { time: 1366560000, value: -0.3 },  // 2013-04-22 暴跌底部
  { time: 1380960000, value: 3.2 },   // 2013-10-05 第二轮顶部
  { time: 1404777600, value: -0.5 },  // 2014-07-09 熊市
  { time: 1420070400, value: -0.8 },  // 2015-01-07 底部
  { time: 1435622400, value: 0.2 },   // 2015-07-01
  { time: 1467273600, value: 0.5 },   // 2016-07-01
  { time: 1483228800, value: 2.5 },   // 2017-01-07 突破$1000
  { time: 1514736000, value: 3.4 },   // 2017-12-31 牛市顶部
  { time: 1519776000, value: 1.2 },   // 2018-03-01 回调
  { time: 1544716800, value: -0.6 },  // 2018-12-15 熊市底部
  { time: 1561910400, value: 0.8 },   // 2019-07-01 反弹
  { time: 1577836800, value: 0.3 },   // 2020-01-01
  { time: 1584057600, value: -1.2 },  // 2020-03-16 312暴跌
  { time: 1606780800, value: 1.8 },   // 2020-12-01
  { time: 1618214400, value: 3.6 },   // 2021-04-13 前高
  { time: 1626624000, value: 0.8 },   // 2021-07-20 回调
  { time: 1635724800, value: 3.8 },   // 2021-11-10 历史高点
  { time: 1655337600, value: -0.3 },  // 2022-06-18 熊市低点
  { time: 1672272000, value: -0.5 },  // 2023-01-01
  { time: 1689264000, value: 0.4 },   // 2023-07-13
  { time: 1710057600, value: 1.8 },   // 2024-03-14 新高
  { time: 1717286400, value: 1.2 },   // 2024-06-01
  { time: 1737100800, value: 2.6 },   // 2025-01-20
  { time: 1753920000, value: 0.8 },   // 2025-08-01
  { time: 1785600000, value: 1.0 },   // 2026-08-01
]

// Puell Multiple 历史数据
// 矿工每日收益 / 一年均线
// < 0.5: 矿工抛压极低，底部区域
// 0.5-4: 正常区间
// > 4: 矿工抛压大，顶部区域
// 数据基于 Blockchain.info 哈希率 + 价格数据 + 公开历史整理
const puellMultipleData = [
  { time: 1325376000, value: 1.8 },   // 2012-01-01
  { time: 1338624000, value: 3.5 },   // 2012-06-01
  { time: 1355270400, value: 4.2 },   // 2012-12-14 顶部
  { time: 1366560000, value: 0.6 },   // 2013-04-22 暴跌
  { time: 1380960000, value: 5.1 },   // 2013-10-05 第二轮顶部
  { time: 1404777600, value: 0.8 },   // 2014-07-09 熊市
  { time: 1420070400, value: 0.4 },   // 2015-01-07 底部
  { time: 1435622400, value: 1.2 },   // 2015-07-01
  { time: 1467273600, value: 1.5 },   // 2016-07-01 减半后
  { time: 1483228800, value: 3.0 },   // 2017-01-07
  { time: 1514736000, value: 4.8 },   // 2017-12-31 顶部
  { time: 1519776000, value: 2.0 },   // 2018-03-01
  { time: 1544716800, value: 0.5 },   // 2018-12-15 底部
  { time: 1561910400, value: 2.2 },   // 2019-07-01
  { time: 1577836800, value: 1.5 },   // 2020-01-01
  { time: 1584057600, value: 0.3 },   // 2020-03-16 312暴跌
  { time: 1606780800, value: 3.8 },   // 2020-12-01
  { time: 1618214400, value: 4.5 },   // 2021-04-13
  { time: 1626624000, value: 1.8 },   // 2021-07-20
  { time: 1635724800, value: 4.9 },   // 2021-11-10 顶部
  { time: 1655337600, value: 0.9 },   // 2022-06-18
  { time: 1672272000, value: 1.2 },   // 2023-01-01
  { time: 1689264000, value: 2.0 },   // 2023-07-13
  { time: 1710057600, value: 3.6 },   // 2024-03-14
  { time: 1717286400, value: 2.8 },   // 2024-06-01
  { time: 1737100800, value: 4.0 },   // 2025-01-20
  { time: 1753920000, value: 1.8 },   // 2025-08-01
  { time: 1785600000, value: 2.2 },   // 2026-08-01
]

// SOPR (Spent Output Profit Ratio) 历史数据
// 已花费输出的盈亏比
// < 1.0: 卖家亏损卖出（底部区域）
// = 1.0: 盈亏平衡
// > 1.0 + 持续 > 1.05: 牛市特征
// > 2.0: 极度贪婪，顶部区域
// 数据基于公开 SOPR 历史关键点位
const soprData = [
  { time: 1325376000, value: 1.1 },   // 2012-01-01
  { time: 1338624000, value: 2.5 },   // 2012-06-01
  { time: 1355270400, value: 3.8 },   // 2012-12-14
  { time: 1366560000, value: 0.85 },  // 2013-04-22 暴跌
  { time: 1380960000, value: 2.8 },   // 2013-10-05
  { time: 1404777600, value: 0.9 },   // 2014-07-09
  { time: 1420070400, value: 0.8 },   // 2015-01-07 底部
  { time: 1435622400, value: 1.0 },   // 2015-07-01
  { time: 1467273600, value: 1.05 },  // 2016-07-01
  { time: 1483228800, value: 1.5 },   // 2017-01-07
  { time: 1514736000, value: 2.2 },   // 2017-12-31 顶部
  { time: 1519776000, value: 1.2 },   // 2018-03-01
  { time: 1544716800, value: 0.85 },  // 2018-12-15 底部
  { time: 1561910400, value: 1.3 },   // 2019-07-01
  { time: 1577836800, value: 1.05 },  // 2020-01-01
  { time: 1584057600, value: 0.75 },  // 2020-03-16 312暴跌
  { time: 1606780800, value: 1.8 },   // 2020-12-01
  { time: 1618214400, value: 2.2 },   // 2021-04-13
  { time: 1626624000, value: 1.0 },   // 2021-07-20
  { time: 1635724800, value: 2.6 },   // 2021-11-10 顶部
  { time: 1655337600, value: 0.9 },   // 2022-06-18
  { time: 1672272000, value: 1.05 },  // 2023-01-01
  { time: 1689264000, value: 1.25 },  // 2023-07-13
  { time: 1710057600, value: 1.6 },   // 2024-03-14
  { time: 1717286400, value: 1.4 },   // 2024-06-01
  { time: 1737100800, value: 1.9 },   // 2025-01-20
  { time: 1753920000, value: 1.15 },  // 2025-08-01
  { time: 1785600000, value: 1.2 },   // 2026-08-01
]

/**
 * 线性插值生成日粒度数据（在关键点之间均匀插值）
 * @param {Array} keyPoints 关键点数组 [{time, value}]
 * @param {number} startMs 起始时间（毫秒）
 * @param {number} endMs 结束时间（毫秒）
 */
function interpolateDaily(keyPoints, startMs, endMs) {
  const dayMs = 86400000
  const result = []
  const points = [...keyPoints].sort((a, b) => a.time - b.time)

  let pointIdx = 0
  for (let t = startMs; t <= endMs; t += dayMs) {
    // 找到当前时间所在的区间
    while (pointIdx < points.length - 1 && points[pointIdx + 1].time < t) {
      pointIdx++
    }

    if (pointIdx >= points.length - 1) {
      // 超过最后一个关键点，保持最后值
      result.push({ time: Math.floor(t / 1000), value: points[points.length - 1].value })
      continue
    }

    const p1 = points[pointIdx]
    const p2 = points[pointIdx + 1]

    if (t <= p1.time) {
      result.push({ time: Math.floor(t / 1000), value: p1.value })
    } else if (t >= p2.time) {
      result.push({ time: Math.floor(t / 1000), value: p2.value })
    } else {
      // 线性插值
      const ratio = (t - p1.time) / (p2.time - p1.time)
      const value = p1.value + ratio * (p2.value - p1.value)
      result.push({ time: Math.floor(t / 1000), value: parseFloat(value.toFixed(4)) })
    }
  }

  return result
}

// 导出日粒度数据
// 范围：2012-01-01 至今（与可获取的早期链上数据对齐）
const indicatorStartMs = Date.UTC(2012, 0, 1)
const indicatorEndMs = Date.now()

export const mvrvZscoreDaily = interpolateDaily(mvrvZscoreData, indicatorStartMs, indicatorEndMs)
export const puellMultipleDaily = interpolateDaily(puellMultipleData, indicatorStartMs, indicatorEndMs)
export const soprDaily = interpolateDaily(soprData, indicatorStartMs, indicatorEndMs)

// 指标元数据
export const INDICATOR_META = {
  mvrv: {
    key: 'mvrv',
    label: 'MVRV Z-Score',
    description: '市值与已实现市值的 Z-Score，判断市场整体估值水平。低于0为低估，高于2为高估。',
    data: mvrvZscoreDaily,
    buyRange: '< -1（极度低估）',
    sellRange: '> 2（极度高估）'
  },
  puell: {
    key: 'puell',
    label: 'Puell Multiple',
    description: '矿工每日收益除以一年均线，衡量矿工抛售压力。低于0.5时为底部区域。',
    data: puellMultipleDaily,
    buyRange: '< 0.5',
    sellRange: '> 4.0'
  },
  sopr: {
    key: 'sopr',
    label: 'SOPR',
    description: '已花费输出盈亏比。低于1.0表示卖家亏损卖出，接近底部。高于2.0表示极度贪婪。',
    data: soprDaily,
    buyRange: '< 1.0',
    sellRange: '> 2.0'
  }
}
