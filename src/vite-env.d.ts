/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 有值(如 http://localhost:8787)→ 走后端 API;未设置 → 读 public/mock 静态 JSON */
  readonly VITE_API_BASE?: string
}
