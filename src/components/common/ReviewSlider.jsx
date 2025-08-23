import React, { useEffect, useState } from "react";
import ReactStars from "react-rating-stars-component";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/pagination";
import "../../App.css";
import { FaStar } from "react-icons/fa";
import { Autoplay, FreeMode, Pagination } from "swiper";
import { apiConnector } from "../../services/apiconnector";
import { ratingsEndpoints } from "../../services/apis";

function ReviewSlider() {
  const [reviews, setReviews] = useState([]);
  const truncateWords = 15;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        console.log("Fetching reviews...");
        const response = await apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API);
        console.log("Reviews API response:", response);
        
        if (response?.data?.success) {
          // Ensure we have an array of reviews
          const reviewsData = Array.isArray(response.data.data) 
            ? response.data.data 
            : [];
          
          // Transform the data with safe defaults
          const formattedReviews = reviewsData.map(review => {
            // Safely extract user data with defaults
            const user = typeof review.user === 'object' ? review.user : {};
            const course = typeof review.course === 'object' ? review.course : {};
            
            return {
              ...review,
              rating: Number(review.rating) || 0,
              review: String(review.review || ''),
              user: {
                firstName: String(user.firstName || 'Anonymous'),
                lastName: String(user.lastName || 'User'),
                image: user.image || null,
              },
              course: {
                courseName: String(course.courseName || 'Unknown Course')
              }
            };
          });
          
          setReviews(formattedReviews);
        } else {
          console.error("Failed to fetch reviews:", response?.data?.message);
          setReviews([]);
        }
      } catch (error) {
        console.error("Error fetching reviews: ", error);
        // Set some default reviews in case of error
        setReviews([{
          id: 'error-review',
          rating: 5,
          review: 'Error loading reviews. Please try again later.',
          user: {
            firstName: 'System',
            lastName: '',
            image: null
          },
          course: {
            courseName: 'Error'
          }
        }]);
      }
    };

    fetchReviews();
  }, []);

  return (
    <div className="text-white">
      <div className="my-[50px] h-[184px] max-w-[100vw] lg:max-w-maxContent p-1">
        <Swiper
          slidesPerView={reviews?.length > 0 ? (reviews.length < 4 ? reviews.length : 4) : 1}
          spaceBetween={14}
          loop={true}
          freeMode={true}
          autoplay={{
            delay: 1000,
            disableOnInteraction: false,
          }}
          modules={[FreeMode, Pagination, Autoplay]}
          className="w-full"
        >
          {reviews && reviews.length > 0 ? (reviews.map((review, index) => (
            <SwiperSlide key={index}>
              <div className="bg-richblack-800 p-4 text-richblack-25 rounded-lg">
                <div className="flex items-center gap-4">
                  <img
                    src={review?.user?.image ? review?.user?.image : `https://api.dicebear.com/5.x/initials/svg?seed=${review?.user?.firstName} ${review?.user?.lastName}`}
                    alt={`${review?.user?.firstName} ${review?.user?.lastName}`}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                      <h1 className="font-semibold text-richblack-5">{`${review?.user?.firstName} ${review?.user?.lastName}`}</h1>
                      <h2 className="text-[12px] font-medium text-richblack-500">
                        {review?.course?.courseName}
                      </h2>
                    </div>
                </div>
                <p className="font-medium text-richblack-25">
                    {review?.review.split(" ").length > truncateWords
                      ? `${review?.review
                          .split(" ")
                          .slice(0, truncateWords)
                          .join(" ")} ...`
                      : `${review?.review}`}
                  </p>
                <div className="flex items-center mt-3 gap-2">
                  <h3 className="font-semibold text-yellow-400">{review.rating.toFixed(1)}</h3>
                  <ReactStars
                    count={5}
                    value={review.rating}
                    size={20}
                    edit={false}
                    activeColor="#ffd700"
                    emptyIcon={<FaStar />}
                    fullIcon={<FaStar />}
                  />
                </div>
              </div>
            </SwiperSlide>
          ))) : (
            <div className="text-center py-8 text-richblack-200">
              No reviews found. Be the first to leave a review!
            </div>
          )}
        </Swiper>
      </div>
    </div>
  );
}

export default ReviewSlider;
