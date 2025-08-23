import { BsArrowRight } from 'react-icons/bs';
import { FaLightbulb } from 'react-icons/fa';

const CourseSuggestion = ({ topic, index }) => (
  <div className="p-3 bg-richblack-800 rounded-lg mb-2 group hover:bg-richblack-700 transition-colors">
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <FaLightbulb className="text-yellow-400" />
      </div>
      <div>
        <h4 className="font-medium text-richblack-5">Idea #{index + 1}</h4>
        <p className="text-richblack-200 mt-1">{topic}</p>
        <button 
          className="mt-2 text-sm text-yellow-400 flex items-center hover:underline"
          onClick={() => {}}
        >
          Create course <BsArrowRight className="ml-1" />
        </button>
      </div>
    </div>
  </div>
);

export default CourseSuggestion;
