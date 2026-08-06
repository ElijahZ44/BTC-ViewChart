import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发环境通过 Vite 代理转发请求到交易所 API，规避浏览器 CORS 限制
// 生产环境需部署一个 Serverless 代理（Cloudflare Worker / Vercel Edge）转发并注入 CORS 头
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Binance 公共行情数据 API（BTCUSDT）
      // 使用 data-api.binance.vision 镜像：无需 API key，国内访问更稳定
      // 接口与 api.binance.com 完全一致（/api/v3/klines、/api/v3/ticker/24hr）
      '/binance-api': {
        target: 'https://data-api.binance.vision',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/binance-api/, '')
      },
      // Coinbase 公开市场数据 API（BTCUSD）
      '/coinbase-api': {
        target: 'https://api.coinbase.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/coinbase-api/, '')
      }
    }
  }
})
