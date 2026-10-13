import { lazy } from "react"
import { Routes, Route } from "react-router-dom"
import MainLayout from "@/layouts/MainLayout"
import NotFound from "@/pages/NotFound"

// 懒加载:图表页按需加载,减小首屏体积
const Home = lazy(() => import("@/pages/Home"))
const PriceCompare = lazy(() => import("@/pages/PriceCompare"))
const TrendAnalysis = lazy(() => import("@/pages/TrendAnalysis"))
// 用户系统页面:静态模式下内部直接渲染提示卡,不发请求(见各页面顶部的 IS_API_MODE 判断)
const Login = lazy(() => import("@/pages/Login"))
const Register = lazy(() => import("@/pages/Register"))
const Admin = lazy(() => import("@/pages/Admin"))

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="compare" element={<PriceCompare />} />
        <Route path="trend" element={<TrendAnalysis />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
