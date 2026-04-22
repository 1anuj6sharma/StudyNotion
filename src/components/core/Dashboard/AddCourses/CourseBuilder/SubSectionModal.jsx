import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { RxCross2 } from "react-icons/rx"
import { useDispatch, useSelector } from "react-redux"

import {
  createSubSection,
  updateSubSection,
} from "../../../../../services/operations/courseDeatailsAPI"
import { setCourse } from "../../../../../slices/courseSlice"
import IconBtn from "../../../../common/IconBtn"
import Upload from "../Upload"
import QuizCreationModal from "../../Instructor/QuizCreationModal"
import { getQuizForInstructor } from "../../../../../services/operations/quizAPI"

export default function SubSectionModal({
  modalData,
  setModalData,
  add = false,
  view = false,
  edit = false,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    getValues,
  } = useForm()

  // console.log("view", view)
  // console.log("edit", edit)
  // console.log("add", add)

  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const { token } = useSelector((state) => state.auth)
  const { course } = useSelector((state) => state.course)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [existingQuiz, setExistingQuiz] = useState(null)
  const [createdSubsectionId, setCreatedSubsectionId] = useState(null)

  useEffect(() => {
    if (view || edit) {
      setValue("lectureTitle", modalData.title || "")
      setValue("lectureDesc", modalData.description || "")
      // Don't set lectureVideo to URL string - leave it null unless user uploads new file
      // The preview will be handled by viewData/editData props in Upload component
    }
  }, [view, edit, modalData.title, modalData.description, setValue])

  // Load existing quiz data when editing or viewing
  useEffect(() => {
    if ((edit || view) && modalData._id) {
      const loadQuiz = async () => {
        try {
          const quizData = await getQuizForInstructor(modalData._id, token)
          setExistingQuiz(quizData)
        } catch (error) {
          console.log("No quiz found for this lecture")
          setExistingQuiz(null)
        }
      }
      loadQuiz()
    }
  }, [edit, view, modalData._id, token])

  const handleQuizCreated = (quizData) => {
    setExistingQuiz(quizData)
  }

  const handleSubSectionModalClose = () => {
    setModalData(null)
  }

  const handleSubsectionSaved = () => {
    // After successfully saving subsection, show quiz creation modal
    // Use setTimeout to ensure modalData is updated first
    setTimeout(() => {
      setShowQuizModal(true)
    }, 100)
  }

  // detect whether form is updated or not
  const isFormUpdated = () => {
    const currentValues = getValues()
    // console.log("changes after editing form values:", currentValues)
    if (
      currentValues.lectureTitle !== modalData.title ||
      currentValues.lectureDesc !== modalData.description ||
      currentValues.lectureVideo instanceof File  // Check if new file uploaded
    ) {
      return true
    }
    return false
  }

  // handle the editing of subsection
  const handleEditSubsection = async () => {
    const currentValues = getValues()
    const formData = new FormData()
    formData.append("sectionId", modalData.sectionId)
    formData.append("subSectionId", modalData._id)

    if (currentValues.lectureTitle !== modalData.title) {
      formData.append("title", currentValues.lectureTitle)
    }

    if (currentValues.lectureDesc !== modalData.description) {
      formData.append("description", currentValues.lectureDesc)
    }

    // Only append if user uploaded a new video file (File object)
    if (currentValues.lectureVideo instanceof File) {
      formData.append("video", currentValues.lectureVideo)
    }

    setLoading(true)
    try {
      const result = await updateSubSection(formData, token)
      if (result) {
        const updatedCourseContent = course.courseContent.map((section) =>
          section._id === modalData.sectionId ? result : section
        )
        const updatedCourse = { ...course, courseContent: updatedCourseContent }
        dispatch(setCourse(updatedCourse))
        toast.success("Subsection updated successfully")
        handleSubsectionSaved()
      }
    } catch (error) {
      console.error("Error updating subsection:", error)
      toast.error(error.response?.data?.message || "Failed to update subsection")
    } finally {
      setLoading(false)
    }
    // Don't setModalData(null) here - let quiz modal open first
  }

  const onSubmit = async (data) => {
    if (view) return

    if (edit) {
      if (!isFormUpdated()) {
        toast.error("No changes made to the form")
      } else {
        handleEditSubsection()
      }
      return
    }

    // Debug logging
    console.log("🔍 lectureVideo value:", data.lectureVideo)
    console.log("🔍 Is File?", data.lectureVideo instanceof File)
    console.log("🔍 Type:", typeof data.lectureVideo)

    const formData = new FormData()
    formData.append("sectionId", modalData)
    formData.append("title", data.lectureTitle)
    formData.append("description", data.lectureDesc)

    // Only append if it's a real File object
    if (data.lectureVideo instanceof File) {
      formData.append("video", data.lectureVideo)
      console.log("✅ Video file appended to FormData")

      // Debug: Log all FormData entries
      console.log("📋 FormData contents:")
      for (let pair of formData.entries()) {
        console.log(`  ${pair[0]}:`, pair[1])
      }
    } else {
      console.error("❌ No valid video file to upload!")
      toast.error("Please upload a video file")
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await createSubSection(formData, token)
      if (result) {
        setCreatedSubsectionId(result._id)
        const updatedCourseContent = course.courseContent.map((section) =>
          section._id === modalData ? result : section
        )
        const updatedCourse = { ...course, courseContent: updatedCourseContent }
        dispatch(setCourse(updatedCourse))
        toast.success("Subsection created successfully")
        handleSubsectionSaved()
      }
    } catch (error) {
      console.error("Error creating subsection:", error)
      toast.error(error.response?.data?.message || "Failed to create subsection")
    } finally {
      setLoading(false)
    }
    // Don't setModalData(null) here - let quiz modal open first
  }

  return (
    <div className="fixed inset-0 z-[1000] !mt-0 grid h-screen w-screen place-items-center overflow-auto bg-white bg-opacity-10 backdrop-blur-sm">
      <div className="my-10 w-11/12 max-w-[700px] rounded-lg border border-richblack-400 bg-richblack-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-richblack-700 p-5">
          <p className="text-xl font-semibold text-richblack-5">
            {view && "Viewing"} {add && "Adding"} {edit && "Editing"} Lecture
          </p>
          <button onClick={() => (!loading ? setModalData(null) : {})}>
            <RxCross2 className="text-2xl text-richblack-5" />
          </button>
        </div>
        {/* Modal Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8 px-8 py-10"
        >
          {/* Lecture Video Upload */}
          <Upload
            name="lectureVideo"
            label="Lecture Video"
            register={register}
            setValue={setValue}
            errors={errors}
            video={true}
            viewData={view ? modalData.videoUrl : null}
            editData={edit ? modalData.videoUrl : null}
          />
          {/* Lecture Title */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm text-richblack-5" htmlFor="lectureTitle">
              Lecture Title {!view && <sup className="text-pink-200">*</sup>}
            </label>
            <input
              disabled={view || loading}
              id="lectureTitle"
              placeholder="Enter Lecture Title"
              {...register("lectureTitle", { required: true })}
              className="form-style w-full"
            />
            {errors.lectureTitle && (
              <span className="ml-2 text-xs tracking-wide text-pink-200">
                Lecture title is required
              </span>
            )}
          </div>
          {/* Lecture Description */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm text-richblack-5" htmlFor="lectureDesc">
              Lecture Description{" "}
              {!view && <sup className="text-pink-200">*</sup>}
            </label>
            <textarea
              disabled={view || loading}
              id="lectureDesc"
              placeholder="Enter Lecture Description"
              {...register("lectureDesc", { required: true })}
              className="form-style resize-x-none min-h-[130px] w-full"
            />
            {errors.lectureDesc && (
              <span className="ml-2 text-xs tracking-wide text-pink-200">
                Lecture Description is required
              </span>
            )}
          </div>
          {!view && (
            <div className="flex justify-end gap-2">
              <IconBtn
                disabled={loading}
                text={loading ? "Loading.." : edit ? "Save Changes" : "Save"}
              />
              {modalData._id && (
                <button
                  type="button"
                  onClick={() => setShowQuizModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {existingQuiz ? "Edit Quiz" : "Create Quiz"}
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Quiz Creation Modal */}
      <QuizCreationModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        subsectionId={createdSubsectionId}
        courseId={course._id}
        existingQuiz={existingQuiz}
        onQuizCreated={handleQuizCreated}
        onSubSectionModalClose={handleSubSectionModalClose}
      />
    </div>
  )
}
