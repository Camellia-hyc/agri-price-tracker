import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"

// 子路径部署(GitHub Pages)时 BASE_URL 为 /agri-price-tracker/,basename 不能带尾斜杠
const basename = import.meta.env.BASE_URL.replace(/\/$/, "")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename || "/"}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
