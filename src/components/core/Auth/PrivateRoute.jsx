import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Navigate, useLocation } from "react-router-dom"
import Spinner from "../../common/Spinner"

function PrivateRoute({ children }) {
  const { token, loading: authLoading } = useSelector((state) => state.auth)
  const { loading: profileLoading } = useSelector((state) => state.profile)
  const [isLoading, setIsLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // If both auth and profile have finished loading, update loading state
    if (!authLoading && !profileLoading) {
      setIsLoading(false)
    }
  }, [authLoading, profileLoading])

  if (isLoading) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default PrivateRoute
