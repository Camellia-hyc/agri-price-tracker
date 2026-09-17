import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold">页面不存在</h1>
      <p className="mt-2 text-muted-foreground">
        你访问的页面可能已被移除或地址有误
      </p>
      <Button asChild className="mt-6">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  )
}
