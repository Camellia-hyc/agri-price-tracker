import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // echarts 按需引入后本体仍约 500KB,独立 chunk 无再拆空间
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // 大依赖拆成独立 chunk,利于浏览器缓存
        manualChunks: {
          echarts: ["echarts"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
})
