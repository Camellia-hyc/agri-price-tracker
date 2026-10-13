// 静态模式(线上 GitHub Pages)下访问登录/注册/管理页时的提示卡:
// 不渲染表单、不发请求 —— 线上版行为零变化的组成部分。
import { ServerOff } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function StaticModeNotice({ feature }: { feature: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24">
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <ServerOff className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{feature}需要本地后端模式</h1>
          <p className="text-sm text-muted-foreground">
            当前为线上静态版,数据来自公开的静态文件。注册、登录与管理后台
            仅在本地演示环境(双击 scripts\demo.cmd,或分别运行 npm run server:dev 与
            npm run dev)中可用。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
