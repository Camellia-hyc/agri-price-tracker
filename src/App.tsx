import { lazy } from "react"
import { Routes, Route } from "react-router-dom"
import MainLayout from "@/layouts/MainLayout"
import NotFound from "@/pages/NotFound"

// 懒加载:图表页按需加载,减小首屏体积
const Home = lazy(() => import("@/pages/Home"))
const PriceCompare = lazy(() => import("@/pages/PriceCompare"))
const TrendAnalysis = lazy(() => import("@/pages/TrendAnalysis"))

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="compare" element={<PriceCompare />} />
        <Route path="trend" element={<TrendAnalysis />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
