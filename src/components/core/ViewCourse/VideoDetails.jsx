import React, { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"



import "video-react/dist/video-react.css"
import { useLocation } from "react-router-dom"
import { BigPlayButton, ControlBar, CurrentTimeDisplay, ForwardControl, LoadingSpinner, PlaybackRateMenuButton, Player, ReplayControl, TimeDivider } from "video-react"

import { markLectureAsComplete, getFullDetailsOfCourse } from "../../../services/operations/courseDeatailsAPI"
import { updateCompletedLectures, setCompletedLectures } from "../../../slices/viewCourseSlice"
import { BiSkipNextCircle, BiSkipPreviousCircle } from "react-icons/bi"
import { MdOutlineReplayCircleFilled } from "react-icons/md"
import QuizModal from "./QuizModal"
import { getQuiz } from "../../../services/operations/quizAPI"

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const playerRef = useRef(null)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { courseSectionData, courseEntireData, completedLectures } =
    useSelector((state) => state.viewCourse)

  // Filter completed lectures to only include those from current course
  const getValidCompletedLectures = () => {
    if (!courseSectionData || !completedLectures) return []
    
    const courseVideoIds = []
    courseSectionData.forEach(section => {
      if (section.subSection) {
        section.subSection.forEach(subsection => {
          courseVideoIds.push(subsection._id.toString())
        })
      }
    })
    
    return completedLectures.filter(lectureId => 
      courseVideoIds.includes(lectureId.toString())
    )
  }

  const validCompletedLectures = getValidCompletedLectures()

  const [videoData, setVideoData] = useState([])
  const [videoEnded, setVideoEnded] = useState(false)
  const [loading, setLoading] = useState(false) // Loading state for lecture completion
  const [isLocked, setIsLocked] = useState(false)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizFailed, setQuizFailed] = useState(false)
  const [unlockTrigger, setUnlockTrigger] = useState(0) // Trigger to re-evaluate unlock logic

  useEffect(() => {
    ; (async () => {
      if (!courseSectionData?.length) return
      if (!courseId && !sectionId && !subSectionId) {
        navigate(`/dashboard/enrolled-courses`)
      } else {
        const filteredData = courseSectionData.filter(
          (course) => course._id === sectionId
        )

        const filteredVideoData = filteredData?.[0]?.subSection.filter(
          (data) => data._id === subSectionId
        )

        // Check if video is unlocked
        const currentSectionIndx = courseSectionData.findIndex(
          (data) => data._id === sectionId
        )
        const currentSubSectionIndx = courseSectionData[
          currentSectionIndx
        ].subSection.findIndex((data) => data._id === subSectionId)

        // First video is always unlocked
        if (currentSectionIndx === 0 && currentSubSectionIndx === 0) {
          setVideoData(filteredVideoData[0])
          setVideoEnded(false)
          setIsLocked(false)
          return
        }

        // Check if previous video is completed AND quiz passed (if quiz exists)
        let isUnlocked = false
        if (currentSubSectionIndx > 0) {
          const prevVideoId = courseSectionData[currentSectionIndx].subSection[currentSubSectionIndx - 1]._id
          const prevVideoCompleted = validCompletedLectures.includes(prevVideoId)
          
          // Check if previous lecture has a quiz and if it's passed
          const checkQuizPass = async () => {
            try {
              const prevQuiz = await getQuiz(prevVideoId, token)
              // Check if the latest attempt has passed
              const latestAttempt = prevQuiz?.attempts?.[prevQuiz.attempts.length - 1]
              return latestAttempt?.hasPassed || !prevQuiz // Unlocked if quiz passed or no quiz
            } catch (error) {
              console.log("No quiz found for previous lecture:", prevVideoId)
              return true // No quiz means unlocked
            }
          }
          
          const quizPassed = await checkQuizPass()
          // Video unlocks if previous video is completed AND quiz is passed
          isUnlocked = prevVideoCompleted && quizPassed
          
          console.log("Checking previous video in same section:", {
            prevVideoId,
            prevVideoCompleted,
            quizPassed,
            isUnlocked,
            validCompletedLectures
          })
        } else if (currentSectionIndx === 0 && currentSubSectionIndx === 0) {
          // First lecture of first section is always unlocked
          isUnlocked = true
        } else if (currentSubSectionIndx > 0 && currentSectionIndx === 0) {
          // First lecture of subsequent sections - check last lecture of previous section
          const prevSection = courseSectionData[currentSectionIndx - 1]
          if (prevSection && prevSection.subSection && prevSection.subSection.length > 0) {
            const lastVideoOfPrevSection = prevSection.subSection[prevSection.subSection.length - 1]._id
            const lastVideoCompleted = validCompletedLectures.includes(lastVideoOfPrevSection)
            
            // Check if previous lecture has a quiz and if it's passed
            const checkQuizPass = async () => {
              try {
                const prevQuiz = await getQuiz(lastVideoOfPrevSection, token)
                return prevQuiz?.hasPassed || !prevQuiz
              } catch (error) {
                console.log("No quiz found for last video of previous section:", lastVideoOfPrevSection)
                return true
              }
            }
            
            const quizPassed = await checkQuizPass()
            // Special case: if current lecture is completed and previous quiz is passed, unlock
            const currentVideoCompleted = validCompletedLectures.includes(subSectionId)
            isUnlocked = (lastVideoCompleted && quizPassed) || (currentVideoCompleted && quizPassed)
          } else {
            // Previous section has no lectures - unlock
            isUnlocked = true
          }
        } else {
          // Should not reach here, but default to unlocked
          isUnlocked = true
        }

        console.log("Final unlock decision:", {
          currentSectionIndx,
          currentSubSectionIndx,
          isUnlocked,
          validCompletedLectures
        })

        if (isUnlocked) {
          setVideoData(filteredVideoData[0])
          setVideoEnded(false)
          setIsLocked(false)
        } else {
          // Show locked video warning instead of redirect
          setVideoData(filteredVideoData[0])
          setVideoEnded(false)
          setIsLocked(true)
        }
      }
    })()
  }, [courseSectionData, courseEntireData, location.pathname, courseId, sectionId, subSectionId, navigate, unlockTrigger])

  // Check if current video's quiz was failed
  useEffect(() => {
    const checkQuizStatus = async () => {
      if (!subSectionId || !token) return
      
      try {
        const quiz = await getQuiz(subSectionId, token)
        if (quiz && quiz.attempts && quiz.attempts.length > 0) {
          const latestAttempt = quiz.attempts[quiz.attempts.length - 1]
          // Set quizFailed if the latest attempt failed
          setQuizFailed(!latestAttempt.hasPassed)
        } else {
          setQuizFailed(false)
        }
      } catch (error) {
        setQuizFailed(false)
      }
    }
    checkQuizStatus()
  }, [subSectionId, token])


  const isFirstVideo = () => {
    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)

    if (currentSectionIndx === 0 && currentSubSectionIndx === 0) {
      return true
    } else {
      return false
    }
  }


  const goToNextVideo = () => {
    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    // Add safety check
    if (currentSectionIndx === -1 || !courseSectionData[currentSectionIndx]) {
      return
    }

    const noOfSubsections =
      courseSectionData[currentSectionIndx].subSection.length

    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)



    if (currentSubSectionIndx !== noOfSubsections - 1) {
      // Add safety check for next subsection
      const nextSubSection = courseSectionData[currentSectionIndx].subSection[currentSubSectionIndx + 1];
      if (!nextSubSection) return;
      
      const nextSubSectionId = nextSubSection._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`
      )
    } else {
      // Add safety check for next section
      const nextSection = courseSectionData[currentSectionIndx + 1];
      if (!nextSection || !nextSection.subSection || !nextSection.subSection[0]) return;
      
      const nextSectionId = nextSection._id
      const nextSubSectionId = nextSection.subSection[0]._id
      navigate(
        `/view-course/${courseId}/section/${nextSectionId}/sub-section/${nextSubSectionId}`
      )
    }
  }


  const isLastVideo = () => {
    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    const noOfSubsections =
      courseSectionData[currentSectionIndx].subSection.length

    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)

    if (
      currentSectionIndx === courseSectionData.length - 1 &&
      currentSubSectionIndx === noOfSubsections - 1
    ) {
      return true
    } else {
      return false
    }
  }


  const goToPrevVideo = () => {


    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)

    if (currentSubSectionIndx !== 0) {
      const prevSubSectionId =
        courseSectionData[currentSectionIndx].subSection[
          currentSubSectionIndx - 1
        ]._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${prevSubSectionId}`
      )
    } else {
      const prevSectionId = courseSectionData[currentSectionIndx - 1]._id
      const prevSubSectionLength =
        courseSectionData[currentSectionIndx - 1].subSection.length
      const prevSubSectionId =
        courseSectionData[currentSectionIndx - 1].subSection[
          prevSubSectionLength - 1
        ]._id
      navigate(
        `/view-course/${courseId}/section/${prevSectionId}/sub-section/${prevSubSectionId}`
      )
    }
  }

  const handleLectureCompletion = async () => {
    setLoading(true)
    const res = await markLectureAsComplete(
      { courseId: courseId, subsectionId: subSectionId },
      token
    )
    if (res) {
      // Update local state immediately
      dispatch(updateCompletedLectures(subSectionId))
      
      // Also refresh the course data to ensure persistence
      try {
        const courseData = await getFullDetailsOfCourse(courseId, token)
        dispatch(setCompletedLectures(courseData.completedVideos))
      } catch (error) {
        console.error("Error refreshing course data:", error)
      }
    }
    setLoading(false)
  }

  const handleQuizComplete = (subsectionId) => {
    // Refresh course data after quiz completion
    const refreshCourseData = async () => {
      try {
        const courseData = await getFullDetailsOfCourse(courseId, token)
        dispatch(setCompletedLectures(courseData.completedVideos))
        
        // Check if quiz was passed and trigger unlock re-evaluation
        const quizData = await getQuiz(subsectionId, token)
        if (quizData && quizData.hasPassed) {
          console.log("Quiz passed - triggering unlock re-evaluation")
          // Trigger unlock re-evaluation
          setUnlockTrigger(prev => prev + 1)
        }
      } catch (error) {
        console.error("Error refreshing course data:", error)
      }
    }
    refreshCourseData()
    setShowQuizModal(false)
  }

  return (
    <div className='md:w-[calc(100vw-320px)] w-screen p-3'>
      {
        !videoData ? <h1>Loading...</h1> :
          (
            <div className="">
              {isLocked ? (
                <div className="w-full aspect-video bg-richblack-800 rounded-lg flex flex-col items-center justify-center text-white">
                  <div className="text-6xl mb-4">🔒</div>
                  <h2 className="text-2xl font-bold mb-2">Video Locked</h2>
                  <p className="text-gray-300 text-center max-w-md mb-6">
                    You must complete the previous video and pass the quiz (if available) before accessing this one. Videos must be watched in sequential order.
                  </p>
                  <button 
                    onClick={() => navigate(`/dashboard/enrolled-courses`)}
                    className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
                  >
                    Back to Course
                  </button>
                </div>
              ) : (
                <Player className="w-full relative"
                  ref={playerRef}
                  src={videoData.videoUrl}
                  aspectRatio="16:9"
                  fluid={true}
                  autoPlay={false}
                  onEnded={() => setVideoEnded(true)}
                >

                  <BigPlayButton position="center" />

                  <LoadingSpinner />
                  <ControlBar>
                    <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.1]} order={7.1} />
                    <ReplayControl seconds={5} order={7.1} />
                    <ForwardControl seconds={5} order={7.2} />
                    <TimeDivider order={4.2} />
                    <CurrentTimeDisplay order={4.1} />
                    <TimeDivider order={4.2} />
                  </ControlBar>
                  {
                    videoEnded && (
                      <div className='flex justify-center items-center'>
                        <div className='flex justify-center items-center gap-4'>
                          {
                            (!validCompletedLectures.includes(videoData._id) || quizFailed) && (
                              <>
                                <button onClick={() => { handleLectureCompletion() }} className='bg-yellow-100 text-richblack-900 absolute top-[20%] hover:scale-90 z-20 font-medium md:text-sm px-4 py-2 rounded-md'>Mark as Completed</button>
                                <button 
                                  onClick={() => setShowQuizModal(true)} 
                                  className='bg-blue-600 text-white absolute top-[35%] hover:scale-90 z-20 font-medium md:text-sm px-4 py-2 rounded-md'
                                >
                                  {quizFailed ? 'Retake Quiz' : 'Take Quiz'}
                                </button>
                              </>
                            )
                          }
                        </div>
                        {
                          !isFirstVideo() && (
                            <div className=' z-20 left-0 top-1/2 transform -translate-y-1/2 absolute m-5'>
                              <BiSkipPreviousCircle onClick={goToPrevVideo} className=" text-2xl md:text-5xl bg-richblack-600 rounded-full cursor-pointer hover:scale-90" />
                              {/* <button onClick={previousLecture} className='bg-blue-500 text-white px-4 py-2 rounded-md'>Previous Lecture</button> */}
                            </div>
                          )

                        }
                        {
                          !isLastVideo() && (
                            <div className=' z-20 right-4 top-1/2 transform -translate-y-1/2 absolute m-5'>
                              <BiSkipNextCircle onClick={goToNextVideo} className="text-2xl md:text-5xl bg-richblack-600 rounded-full cursor-pointer hover:scale-90" />
                              {/* <button onClick={nextLecture} className='bg-blue-500 text-white px-4 py-2 rounded-md'>Next Lecture</button> */}
                            </div>
                          )
                        }
                        {
                          <MdOutlineReplayCircleFilled onClick={() => { playerRef.current.seek(0); playerRef.current.play(); setVideoEnded(false) }} className="text-2xl md:text-5xl bg-richblack-600 rounded-full cursor-pointer hover:scale-90 absolute top-1/2 z-20" />
                        }
                      </div>
                    )
                  }
                </Player>
              )}
            </div>
          )
      }
      {/* video title and desc */}
      <div className='mt-5'>
        <h1 className='text-2xl font-bold text-richblack-25'>{videoData?.title}</h1>
        <p className='text-gray-500 text-richblack-100'>{videoData?.description}</p>
      </div>

      {/* Quiz Modal */}
      <QuizModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        subsectionId={subSectionId}
        onQuizComplete={handleQuizComplete}
        videoTitle={videoData?.title}
      />
    </div>
  )
}


export default VideoDetails
