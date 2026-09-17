import { Suspense } from "react"
import { Outlet } from "react-router-dom"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* 只替换内容区,Header/Footer 不闪 */}
        <Suspense
          fallback={
            <div className="px-4 py-16 text-center text-muted-foreground">
              页面加载中…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
