import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';

const CourseRecommendation = ({ course }) => (
  <Link 
    to={`/courses/${course._id}`}
    className="block p-3 bg-richblack-800 rounded-lg hover:bg-richblack-700 transition-colors mb-2"
  >
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-16 h-16 bg-richblack-700 rounded-md overflow-hidden">
        {course.thumbnail && (
          <img 
            src={course.thumbnail} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-richblack-5 truncate">{course.title}</h4>
        <p className="text-sm text-richblack-300 truncate">{course.instructor?.name || 'Instructor'}</p>
        <div className="flex items-center mt-1">
          <span className="text-yellow-400 flex items-center text-sm">
            <FaStar className="mr-1" />
            {course.rating?.average?.toFixed(1) || 'New'}
          </span>
          <span className="mx-2 text-richblack-500">•</span>
          <span className="text-sm text-richblack-300">{course.students?.length || 0} students</span>
        </div>
      </div>
      <div className="text-yellow-50 font-medium">
        ${course.price}
      </div>
    </div>
  </Link>
);

export default CourseRecommendation;
