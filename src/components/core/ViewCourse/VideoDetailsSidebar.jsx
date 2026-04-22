import React from 'react'
import { useState } from 'react';
import { useParams } from 'react-router';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import IconBtn from "../../common/IconBtn"
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { MdOutlineKeyboardArrowDown } from 'react-icons/md'

const VideoDetailsSidebar = ({ setReviewModal }) => {
  console.log("HII", setReviewModal);
  const [videoActive, setVideoActive] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const { courseId, sectionId, subsectionId } = useParams();
  const { courseSectionData, courseEntireData, completedLectures, totalNoOfLectures } = useSelector(state => state.viewCourse);
  const navigate = useNavigate();

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

  // Debug logging
  console.log("Debug - Course Data:", {
    courseSectionData,
    completedLectures,
    validCompletedLectures,
    currentVideoId: subsectionId
  });

  const isVideoUnlocked = (sectionIndex, subSectionIndex) => {
    // First video is always unlocked
    if (sectionIndex === 0 && subSectionIndex === 0) {
      console.log(" First video - always unlocked")
      console.log("🔓 First video - always unlocked")
      return true
    }

    // Check if previous video in same section is completed
    if (subSectionIndex > 0) {
      const prevVideoId = courseSectionData[sectionIndex].subSection[subSectionIndex - 1]._id
      const isPrevCompleted = validCompletedLectures.includes(prevVideoId)
      console.log(" Checking previous video in same section:", {
        prevVideoId,
        isPrevCompleted,
        validCompletedLectures
      })
      return isPrevCompleted
    }

    // Check if last video of previous section is completed
    if (subSectionIndex === 0 && sectionIndex > 0) {
      const prevSection = courseSectionData[sectionIndex - 1]
      const lastVideoOfPrevSection = prevSection.subSection[prevSection.subSection.length - 1]._id
      const isLastOfPrevCompleted = validCompletedLectures.includes(lastVideoOfPrevSection)
      console.log(" Checking last video of previous section:", {
        lastVideoOfPrevSection,
        isLastOfPrevCompleted,
        validCompletedLectures
      })
      return isLastOfPrevCompleted
    }

    return false
  };

  const handleVideoClick = (section, subSection, sectionIndex, subSectionIndex) => {
    if (!isVideoUnlocked(sectionIndex, subSectionIndex)) {
      // Don't navigate to locked videos
      return
    }

    if (window.innerWidth < 1024) {
      setShowSidebar(true);
    }
    navigate(`/view-course/${courseId}/section/${section._id}/sub-section/${subSection._id}`);
  };
  useEffect(() => {
    ; (() => {
      if (!courseSectionData) return;
      const currentSectionIndex = courseSectionData.findIndex((section) => section._id === sectionId);
      const currentSubSectionIndex = courseSectionData[currentSectionIndex]?.subSection.findIndex((subSection) => subSection?._id === subsectionId);
      if (currentSectionIndex === -1 || currentSubSectionIndex === -1) return;
      const activesubsectionId = courseSectionData[currentSectionIndex].subSection[currentSubSectionIndex]._id;
      setVideoActive(activesubsectionId);
    })();
  }, [courseSectionData, sectionId, subsectionId]);

  return (
    <>
      <div className={`${showSidebar ? "" : "hidden"} w-6 h-72 md:hidden absolute center`}>
        <FaChevronRight onClick={() => { setShowSidebar(!showSidebar); }} className={` md:hidden z-10 cursor-pointer text-2xl text-richblack-900 m-2 bg-richblack-100 rounded-full p-1 top-3 absolute left-0`} />
      </div>
      <div className={`${showSidebar ? "h-0 w-0" : "h-[calc(100vh-3.5rem)] w-[320px]"} transition-all duration-700 z-20 relative offSidebar1`}>
        <div className={`${showSidebar ? "hidden" : ""} transition-all origin-right duration-500 flex h-[calc(100vh-3.5rem)] w-[320px] max-w-[350px] flex-col border-r-[1px] border-r-richblack-700 bg-richblack-800 offSidebar2`}>
          <div className={`${showSidebar ? "hidden" : ""} mx-5   flex flex-col items-start justify-between gap-2 gap-y-4 border-b border-richblack-600 py-5 text-lg font-bold text-richblack-25 offSidebar2`}>
            <div className='flex w-full items-center justify-between '>
              <div className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-richblack-100 p-1 text-richblack-700 hover:scale-90'>
                <FaChevronLeft className='cursor-pointer md:hidden' onClick={() => { setShowSidebar(true) }} />
                <FaChevronLeft className='cursor-pointer hidden md:block' onClick={() => {
                  navigate(`/dashboard/enrolled-courses`);
                }} />
              </div>
              <div onClick={() => setReviewModal(true)} >
                <IconBtn text={"Review"} />
              </div>

            </div>
            <div className='flex flex-col'>
              <p>{courseEntireData?.courseName}</p>
              <p className='text-sm font-semibold text-richblack-500'>
                {validCompletedLectures?.length} of {totalNoOfLectures} Lectures Completed
              </p>
            </div>
          </div>
          <div className='h-[calc(100vh - 5rem)] overflow-y-auto px-2'>
            {
              courseSectionData?.map((section, sectionIndex) => (
                <details key={sectionIndex} className=' appearance-none text-richblack-5 detailanimatation'>
                  <summary className='mt-2 cursor-pointer text-sm text-richblack-5 appearance-none'>
                    <div className='flex flex-row justify-between bg-richblack-600 px-5 py-4'>
                      <p className='w-[70%] font-semibold'>{section?.sectionName}</p>
                      <div className='flex items-center gap-3'>
                        <MdOutlineKeyboardArrowDown className='arrow' />
                      </div>
                    </div>
                  </summary>
                  {
                    section?.subSection.map((subSection, subSectionIndex) => {
                      const isUnlocked = isVideoUnlocked(sectionIndex, subSectionIndex);
                      const isCompleted = validCompletedLectures?.includes(subSection?._id);
                      
                      return (
                        <div key={subSection?._id} className='transition-[height] duration-500 ease-in-out'>
                          <div 
                            onClick={() => handleVideoClick(section, subSection, sectionIndex, subSectionIndex)}
                            className={`${subSection?._id === videoActive ? ("bg-yellow-200") : (isUnlocked ? "bg-richblack-50" : "bg-richblack-700 opacity-60")} ${isUnlocked ? "cursor-pointer" : "cursor-not-allowed"} items-baseline flex gap-3 px-5 py-2 font-semibold text-richblack-800 relative border-b-[1px] border-richblack-600`}
                          >
                            <div className="checkbox-wrapper-19 absolute bottom-1">
                              <input readOnly={true} checked={isCompleted} type="checkbox" />
                              <label className="check-box"></label>
                            </div>
                            
                            {/* Lock/Unlock indicator */}
                            <div className="ml-6 flex items-center gap-2">
                              {!isUnlocked && (
                                <div className="text-xs text-red-500 font-semibold">
                                  🔒 LOCKED
                                </div>
                              )}
                              {isUnlocked && !isCompleted && (
                                <div className="text-xs text-green-500 font-semibold">
                                  📺 AVAILABLE
                                </div>
                              )}
                              {isCompleted && (
                                <div className="text-xs text-blue-500 font-semibold">
                                  ✅ COMPLETED
                                </div>
                              )}
                              <p className={`${!isUnlocked ? "text-gray-400" : ""}`}>{subSection?.title}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  }
                </details>
              ))
            }
          </div>
        </div>
      </div>
    </>
  )
}

export default VideoDetailsSidebar
