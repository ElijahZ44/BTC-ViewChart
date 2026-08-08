import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发环境通过 Vite 代理转发请求，规避浏览器 CORS 限制
// 生产环境需部署 Serverless 代理（Cloudflare Worker / Vercel Edge）
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Blockchain.info 公共链上数据 API
      // 提供 BTC 市场价格（2009至今）、市值、哈希率等
      '/bc-info': {
        target: 'https://api.blockchain.info',
        changeOrigin: true,
        secure: true,
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'application/json'
        },
        rewrite: (path) => path.replace(/^\/bc-info/, '')
      },
      // Alternative.me 恐惧贪婪指数 API
      // 实时情绪指标，历史数据约 2 年
      '/alt-me': {
        target: 'https://api.alternative.me',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/alt-me/, '')
      }
    }
  }
})
