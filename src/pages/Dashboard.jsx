import { Outlet } from "react-router-dom"
import Sidebar from "../components/core/Dashboard/Sidebar"

function Dashboard() {
  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1200px] py-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Dashboard

