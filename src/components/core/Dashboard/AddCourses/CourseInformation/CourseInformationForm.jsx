import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { HiOutlineCurrencyRupee } from "react-icons/hi"
import { MdNavigateNext } from "react-icons/md"
import { useDispatch, useSelector } from "react-redux"

import {
  addCourseDetails,
  editCourseDetails,
  fetchCourseCategories,
} from "../../../../../services/operations/courseDeatailsAPI"
import { setCourse, setStep } from "../../../../../slices/courseSlice"
import { COURSE_STATUS } from "../../../../../utils/constants"
import IconBtn from "../../../../common/IconBtn"
import Upload from "../Upload"
import ChipInput from "./ChipInput"
import RequirementsField from "./RequirementsField"

export default function CourseInformationForm() {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm()

  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { course, editCourse } = useSelector((state) => state.course)
  const [loading, setLoading] = useState(false)
  const [courseCategories, setCourseCategories] = useState([])

  useEffect(() => {
    const getCategories = async () => {
      setLoading(true)
      try {
        const categories = await fetchCourseCategories()
        if (categories?.length > 0) {
          setCourseCategories(categories)
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast.error("Failed to load course categories")
      } finally {
        setLoading(false)
      }
    }
    
    // if form is in edit mode and course data is available
    if (editCourse && course) {
      setValue("courseTitle", course.courseName || "")
      setValue("courseShortDesc", course.courseDescription || "")
      setValue("coursePrice", course.price || 0)
      setValue("courseTags", course.tag || [])
      setValue("courseBenefits", course.whatYouWillLearn || "")
      setValue("courseCategory", course.category || "")
      setValue("courseRequirements", course.instructions || [])
      // Don't set courseImage to URL string - leave it null unless user uploads new file
      // The preview will be handled by editData prop in Upload component
    }
    
    getCategories()
  }, [course, editCourse, setValue])

  const isFormUpdated = () => {
    if (!course) return true; // If no course data, consider form as updated to allow creation
    
    const currentValues = getValues()
    
    // Helper function to safely compare arrays
    const arraysEqual = (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      return a.every((val, index) => val === b[index]);
    }
    
    // Check each field for changes
    if (currentValues.courseTitle !== (course.courseName || '')) return true;
    if (currentValues.courseShortDesc !== (course.courseDescription || '')) return true;
    if (Number(currentValues.coursePrice) !== Number(course.price || 0)) return true;
    if (!arraysEqual(currentValues.courseTags || [], course.tag || [])) return true;
    if (currentValues.courseBenefits !== (course.whatYouWillLearn || '')) return true;
    if ((currentValues.courseCategory?._id || '') !== (course.category?._id || '')) return true;
    if (!arraysEqual(currentValues.courseRequirements || [], course.instructions || [])) return true;
    // Check if a new file was uploaded (File object means user selected new image)
    if (currentValues.courseImage instanceof File) return true;
    
    return false
  }

  //   handle next button click
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      if (editCourse) {
        if (!isFormUpdated()) {
          toast.error("No changes made to the form");
          setLoading(false);
          return;
        }
        
        formData.append("courseId", course._id);
        const currentValues = getValues();
        
        // Only append fields that have changed
        if (currentValues.courseTitle !== course.courseName) {
          formData.append("courseName", data.courseTitle);
        }
        if (currentValues.courseShortDesc !== course.courseDescription) {
          formData.append("courseDescription", data.courseShortDesc);
        }
        if (Number(currentValues.coursePrice) !== Number(course.price)) {
          formData.append("price", data.coursePrice);
        }
        if (JSON.stringify(currentValues.courseTags) !== JSON.stringify(course.tag || [])) {
          formData.append("tag", JSON.stringify(data.courseTags));
        }
        if (currentValues.courseBenefits !== course.whatYouWillLearn) {
          formData.append("whatYouWillLearn", data.courseBenefits);
        }
        const categoryId = typeof data.courseCategory === 'object' ? data.courseCategory._id : data.courseCategory;
        if (categoryId !== (course.category?._id || course.category)) {
          formData.append("category", categoryId);
        }
        if (JSON.stringify(currentValues.courseRequirements) !== JSON.stringify(course.instructions || [])) {
          formData.append("instructions", JSON.stringify(data.courseRequirements));
        }
        // Only append if user uploaded a new file (File object)
        if (data.courseImage instanceof File) {
          formData.append("thumbnailImage", data.courseImage);
        }
        
        const result = await editCourseDetails(formData, token);
        if (result) {
          dispatch(setStep(2));
          dispatch(setCourse(result));
          toast.success("Course updated successfully!");
        }
      } else {
        // For new course creation
        // Debug logging
        console.log("🔍 courseImage value:", data.courseImage)
        console.log("🔍 Is File?", data.courseImage instanceof File)
        console.log("🔍 Type:", typeof data.courseImage)

        formData.append("courseName", data.courseTitle);
        formData.append("courseDescription", data.courseShortDesc);
        formData.append("price", data.coursePrice);
        formData.append("tag", JSON.stringify(data.courseTags));
        formData.append("whatYouWillLearn", data.courseBenefits);
        formData.append("category", typeof data.courseCategory === 'object' ? data.courseCategory._id : data.courseCategory);
        formData.append("status", COURSE_STATUS.DRAFT);
        formData.append("instructions", JSON.stringify(data.courseRequirements));

        // Only append if it's a real File object
        if (data.courseImage instanceof File) {
          formData.append("thumbnailImage", data.courseImage);
          console.log("✅ Thumbnail image appended to FormData")
        } else {
          console.error("❌ No valid image file to upload!")
          toast.error("Please upload a course thumbnail image")
          setLoading(false)
          return
        }
        
        const result = await addCourseDetails(formData, token);
        if (result) {
          dispatch(setStep(2));
          dispatch(setCourse(result));
          toast.success("Course created successfully!");
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(error.response?.data?.message || "Failed to save course. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-6"
    >
      {/* Course Title */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseTitle">
          Course Title <sup className="text-pink-200">*</sup>
        </label>
        <input
          id="courseTitle"
          placeholder="Enter Course Title"
          {...register("courseTitle", { required: true })}
          className="form-style w-full"
        />
        {errors.courseTitle && (
          <span className="ml-2 text-xs tracking-wide text-pink-200">
            Course title is required
          </span>
        )}
      </div>
      {/* Course Short Description */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseShortDesc">
          Course Short Description <sup className="text-pink-200">*</sup>
        </label>
        <textarea
          id="courseShortDesc"
          placeholder="Enter Description"
          {...register("courseShortDesc", { required: true })}
          className="form-style resize-x-none min-h-[130px] w-full"
        />
        {errors.courseShortDesc && (
          <span className="ml-2 text-xs tracking-wide text-pink-200">
            Course Description is required
          </span>
        )}
      </div>
      {/* Course Price */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="coursePrice">
          Course Price <sup className="text-pink-200">*</sup>
        </label>
        <div className="relative">
          <input
            id="coursePrice"
            placeholder="Enter Course Price"
            {...register("coursePrice", {
              required: true,
              valueAsNumber: true,
              pattern: {
                value: /^(0|[1-9]\d*)(\.\d+)?$/,
              },
            })}
            className="form-style w-full !pl-12"
          />
          <HiOutlineCurrencyRupee className="absolute left-3 top-1/2 inline-block -translate-y-1/2 text-2xl text-richblack-400" />
        </div>
        {errors.coursePrice && (
          <span className="ml-2 text-xs tracking-wide text-pink-200">
            Course Price is required
          </span>
        )}
      </div>
      {/* Course Category */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseCategory">
          Course Category <sup className="text-pink-200">*</sup>
        </label>
        <select
          {...register("courseCategory", { required: true })}
          defaultValue=""
          id="courseCategory"
          className="form-style w-full"
        >
          <option value="" disabled>
            Choose a Category
          </option>
          {!loading &&
            courseCategories?.map((category, indx) => (
              <option key={indx} value={category?._id}>
                {category?.name}
              </option>
            ))}
        </select>
        {errors.courseCategory && (
          <span className="ml-2 text-xs tracking-wide text-pink-200">
            Course Category is required
          </span>
        )}
      </div>
      {/* Course Tags */}
      <ChipInput
        label="Tags"
        name="courseTags"
        placeholder="Enter Tags and press Enter"
        register={register}
        errors={errors}
        setValue={setValue}
        getValues={getValues}
      />
      {/* Course Thumbnail Image */}
      <div className="flex flex-col space-y-2">
        <Upload
          name="courseImage"
          label="Course Thumbnail"
          register={register}
          setValue={setValue}
          errors={errors}
          editData={editCourse ? course?.thumbnail : null}
        />
        {errors.courseImage && (
          <span className="ml-2 text-xs tracking-wide text-pink-200">
            {errors.courseImage.message}
          </span>
        )}
      </div>
      {/* Benefits of the course */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseBenefits">
          Benefits of the course <sup className="text-pink-200">*</sup>
        </label>
        <textarea
          id="courseBenefits"
          placeholder="Enter benefits of the course"
          {...register("courseBenefits", { required: true })}
          className="form-style resize-x-none min-h-[130px] w-full"
        />
        {errors.courseBenefits && (
          <span className="ml-2 text-xs tracking-wide text-pink-200">
            Benefits of the course is required
          </span>
        )}
      </div>
      {/* Requirements/Instructions */}
      <RequirementsField
        name="courseRequirements"
        label="Requirements/Instructions"
        register={register}
        setValue={setValue}
        errors={errors}
        getValues={getValues}
      />
      {/* Next Button */}
      <div className="flex justify-end gap-x-2">
        {editCourse && (
          <button
            onClick={() => dispatch(setStep(2))}
            disabled={loading}
            className={`flex cursor-pointer items-center gap-x-2 rounded-md bg-richblack-300 py-[8px] px-[20px] font-semibold text-richblack-900`}
          >
            Continue Wihout Saving
          </button>
        )}
        <IconBtn
          disabled={loading}
          text={!editCourse ? "Next" : "Save Changes"}
        >
          <MdNavigateNext />
        </IconBtn>
      </div>
    </form>
  )
}
