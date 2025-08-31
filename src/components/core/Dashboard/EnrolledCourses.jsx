import { useEffect, useState } from "react"
import ProgressBar from "@ramonak/react-progress-bar"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { getUserEnrolledCourses } from "../../../services/operations/profileAPI"

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const [enrolledCourses, setEnrolledCourses] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await getUserEnrolledCourses(token)
      
      if (res && Array.isArray(res)) {
        // Filter out any draft courses
        const publishedCourses = res.filter(course => course.status !== "Draft")
        setEnrolledCourses(publishedCourses)
      } else {
        setEnrolledCourses([])
      }
    } catch (error) {
      console.error("Error fetching enrolled courses:", error)
      setError("Failed to load enrolled courses. Please try again later.")
      setEnrolledCourses([]) // Set to empty array to show empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchEnrolledCourses()
    } else {
      setError("Authentication required. Please log in.")
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <>
      <div className="text-3xl text-richblack-50 uppercase tracking-wider lg:text-left text-center">Enrolled Course</div>
      {loading ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
          <div className="spinner"></div>
          <p className="mt-4 text-richblack-5">Loading your courses...</p>
        </div>
      ) : error ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
          <div className="text-center">
            <p className="text-lg text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchEnrolledCourses}
              className="px-4 py-2 bg-yellow-50 text-richblack-900 rounded-md hover:bg-yellow-100 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : !enrolledCourses?.length ? (
        <div className="grid min-h-[50vh] place-items-center">
          <p className="text-richblack-5 text-center">
            You have not enrolled in any courses yet.
            <br />
            <button 
              onClick={() => navigate("/dashboard/catalog")}
              className="mt-2 text-yellow-50 hover:underline"
            >
              Browse Courses
            </button>
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className='my-8 text-richblack-5 w-[650px] md:w-full'>
            {/* Headings */}
            <div className="flex rounded-t-lg bg-richblack-500 ">
              <p className="w-[45%] px-5 py-3 uppercase tracking-wider">Course Name</p>
              <p className="w-1/4 px-2 py-3 uppercase tracking-wider">Duration</p>
              <p className="flex-1 px-2 py-3 uppercase tracking-wider">Progress</p>
            </div>
            {/* Course Names */}
            {enrolledCourses.map((course, i, arr) => (
              <div
                className={`flex items-center border border-richblack-700 ${i === arr.length - 1 ? "rounded-b-lg" : "rounded-none"
                  }`}
                key={i}
              >
                <div
                  className="flex w-[45%] cursor-pointer items-center gap-4 px-5 py-3"
                  onClick={() => {
                    navigate(
                      `/view-course/${course?._id}/section/${course.courseContent?.[0]?._id}/sub-section/${course.courseContent?.[0]?.subSection?.[0]?._id}`
                    )
                  }}
                >
                  <img
                    src={course.thumbnail}
                    alt="course_img"
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="flex max-w-xs flex-col gap-2">
                    <p className="font-semibold uppercase tracking-wider">{course.courseName}</p>
                    <ul style={{ listStyle: 'none', padding: 0 }} className="tracking-wider">
                      {course.courseDescription.split('\n').splice(0, 1).map((line, index) => (
                        <li key={index} style={{ display: 'flex', alignItems: 'flex-start' }} className="text-xs text-richblack-300">
                          <span style={{ marginRight: '0.5em' }}>{index + 1}.</span>
                          <span>{line.trim().substring(line.indexOf('.') + 1).trim().slice(0, 50)}{line.length > 50 ? '...' : ''}</span>
                        </li>
                      ))}
                    </ul>

                  </div>
                </div>
                <div className="w-1/4 px-2 py-3 tracking-wider uppercase">{course?.totalDuration}</div>
                <div className="flex w-1/5 flex-col gap-2 px-2 py-3 tracking-wider uppercase">
                  <p>Progress - {course.progressPercentage || 0}%</p>
                  <ProgressBar
                    completed={course.progressPercentage || 0}
                    height="8px"
                    isLabelVisible={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
