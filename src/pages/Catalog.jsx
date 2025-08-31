import React, { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import Footer from "../components/common/Footer"
import CourseCard from "../components/core/Catalog/Course_Card"
import CourseSlider from "../components/core/Catalog/Course_Slider"
import { apiConnector } from "../services/apiconnector"
import { categories } from "../services/apis"
import { getCatalogPageData } from "../services/operations/pageAndComponentDatas"
import Error from "./Error"

function Catalog() {
  const { loading } = useSelector((state) => state.profile)
  const { catalogName } = useParams()
  const [active, setActive] = useState(1)
  const [catalogPageData, setCatalogPageData] = useState(null)
  const [categoryId, setCategoryId] = useState("")
  const [allCategories, setAllCategories] = useState([])
  const [showCategories, setShowCategories] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiConnector("GET", categories.CATEGORIES_API)
        setAllCategories(res.data.data)
        const category = res?.data?.data?.find(
          (ct) => ct.name.split(" ").join("-").toLowerCase() === catalogName
        )
        if (category) {
          setCategoryId(category._id)
        }
      } catch (error) {
        console.log("Could not fetch Categories.", error)
      }
    })()
  }, [catalogName])

  useEffect(() => {
    if (categoryId) {
      ;(async () => {
        try {
          const res = await getCatalogPageData(categoryId)
          setCatalogPageData(res)
        } catch (error) {
          console.log(error)
        }
      })()
    }
  }, [categoryId])

  if (loading || !catalogPageData) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }
  if (!loading && !catalogPageData.success) {
    return <Error />
  }

  return (
    <>
      {/* Hero Section */}
      <div className="box-content bg-richblack-800 px-4">
        <div className="mx-auto flex min-h-[260px] max-w-maxContentTab flex-col justify-center gap-4 lg:max-w-maxContent">
          <p className="text-sm text-richblack-300">
            {`Home / Catalog / `}
            <span className="text-yellow-25">
              {catalogPageData?.data?.selectedCategory?.name}
            </span>
          </p>
          <p className="text-3xl text-richblack-5">
            {catalogPageData?.data?.selectedCategory?.name}
          </p>
          <p className="max-w-[870px] text-richblack-200">
            {catalogPageData?.data?.selectedCategory?.description}
          </p>
        </div>
      </div>

      {/* Show All Categories Button */}
      <div className="mx-auto max-w-maxContentTab lg:max-w-maxContent px-4 py-12">
        <button
          className="px-4 py-2 bg-yellow-25 text-richblack-800 rounded-md"
          onClick={() => setShowCategories(!showCategories)}
        >
          {showCategories ? "Hide All Categories" : "Show All Categories"}
        </button>
        {showCategories && (
          <div className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allCategories.map((category) => (
              <div key={category._id} className="p-4 border border-richblack-600 rounded-md">
                <h3 className="text-xl text-yellow-25">{category.name}</h3>
                <p className="text-richblack-200">{category.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 1 */}
      <div className="mx-auto box-content w-full max-w-maxContentTab px-4 py-12 lg:max-w-maxContent">
        <div className="section_heading">Courses to get you started</div>
        <div className="my-4 flex border-b border-b-richblack-600 text-sm">
          <p
            className={`px-4 py-2 ${
              active === 1
                ? "border-b border-b-yellow-25 text-yellow-25"
                : "text-richblack-50"
            } cursor-pointer`}
            onClick={() => setActive(1)}
          >
            Most Popular
          </p>
          <p
            className={`px-4 py-2 ${
              active === 2
                ? "border-b border-b-yellow-25 text-yellow-25"
                : "text-richblack-50"
            } cursor-pointer`}
            onClick={() => setActive(2)}
          >
            New
          </p>
        </div>
        <div>
          <CourseSlider
            Courses={catalogPageData?.data?.selectedCategory?.courses}
          />
        </div>
      </div>
      {/* Debug: Log the API response */}
      {console.log('Catalog Page Data:', catalogPageData)}

      {/* Section 2 - Top courses in different category */}
      <div className="mx-auto box-content w-full max-w-maxContentTab px-4 py-12 lg:max-w-maxContent">
        <div className="section_heading">
          {catalogPageData?.data?.differentCategory?.name 
            ? `Top courses in ${catalogPageData.data.differentCategory.name}`
            : 'Recommended for you'}
        </div>
        <div className="py-8">
          {catalogPageData?.data?.differentCategory?.courses?.length > 0 ? (
            <CourseSlider
              Courses={catalogPageData.data.differentCategory.courses}
            />
          ) : (
            <div className="text-center py-8 text-richblack-200">
              No recommended courses available at the moment.
            </div>
          )}
        </div>
      </div>

      {/* Section 3 - Most Selling Courses (Frequently Bought) */}
      <div className="mx-auto box-content w-full max-w-maxContentTab px-4 py-12 lg:max-w-maxContent">
        <div className="section_heading">Frequently Bought</div>
        <div className="py-8">
          {catalogPageData?.data?.mostSellingCourses?.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {catalogPageData.data.mostSellingCourses
                .slice(0, 4)
                .map((course, i) => {
                  console.log('Course data:', course); // Debug log
                  return (
                    <CourseCard 
                      course={course} 
                      key={course?._id || i} 
                      Height={"h-[400px]"} 
                    />
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-richblack-200">
              No frequently bought courses to show.
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}

export default Catalog
