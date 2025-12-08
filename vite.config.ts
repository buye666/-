
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量，包括 .env 文件和系统变量
  // 第三个参数 '' 表示加载所有变量，不仅仅是 VITE_ 开头的
  const env = loadEnv(mode, (process as any).cwd(), '')

  return {
    plugins: [react()],
    define: {
      // 在构建时将 process.env.API_KEY 替换为实际的字符串值
      // 优先读取 API_KEY，其次读取 VITE_API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || '')
    }
  }
})
