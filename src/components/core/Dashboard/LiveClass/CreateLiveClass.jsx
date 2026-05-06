import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { createLiveClass } from '../../../../services/operations/liveClassAPI';
import { fetchInstructorCourses } from '../../../../services/operations/courseDeatailsAPI';
import IconBtn from '../../../common/IconBtn';
import { MdOutlineVideoCall } from 'react-icons/md';

const CreateLiveClass = () => {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  useEffect(() => {
    const getCourses = async () => {
      try {
        const result = await fetchInstructorCourses(token);
        if (result) {
          setCourses(result);
        }
      } catch (error) {
        console.log('Error fetching courses:', error);
      }
    };
    getCourses();
  }, [token]);

  const generateRandomString = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      console.log('Form data before processing:', data);
      
      const roomId = `room-${Date.now()}-${generateRandomString(8)}`;
      const meetingUrl = `${window.location.origin}/live-class/${roomId}`;
      
      const formData = {
        title: data.title,
        description: data.description,
        courseId: data.courseId,
        scheduledTime: new Date(data.scheduledTime).toISOString(),
        scheduledAt: new Date(data.scheduledTime).toISOString(), // Add this line to match backend
        duration: parseInt(data.duration) || 60,
        maxParticipants: parseInt(data.maxParticipants) || 100,
        maxAttendees: parseInt(data.maxParticipants) || 100, // Add this line to match backend
        isRecorded: data.isRecorded || false,
        chatEnabled: data.chatEnabled !== false,
        screenShareEnabled: data.screenShareEnabled !== false,
        roomId,
        meetingUrl
      };
      
      console.log('Sending to API:', formData);
      const result = await createLiveClass(formData, token);
      console.log('API Response:', result);
      if (result) {
        toast.success('Live class created successfully!');
        reset();
        // Navigate to live classes page to see the newly created class
        navigate('/dashboard/live-classes');
      }
    } catch (error) {
      console.error('Error creating live class:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create live class');
    }
    setLoading(false);
  };

  return (
    <div className="bg-richblack-900 text-white min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-richblack-5 mb-2">
            Create Live Class
          </h1>
          <p className="text-richblack-300">
            Schedule a live class session for your students
          </p>
        </div>

        <div className="bg-richblack-800 rounded-lg p-6 border border-richblack-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-richblack-5 mb-2">
                Class Title <span className="text-pink-200">*</span>
              </label>
              <input
                type="text"
                {...register('title', { required: 'Title is required' })}
                className="w-full px-3 py-2 bg-richblack-700 border border-richblack-600 rounded-md text-richblack-5 focus:outline-none focus:ring-2 focus:ring-yellow-50"
                placeholder="Enter class title"
              />
              {errors.title && (
                <p className="text-pink-200 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-richblack-5 mb-2">
                Description <span className="text-pink-200">*</span>
              </label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={4}
                className="w-full px-3 py-2 bg-richblack-700 border border-richblack-600 rounded-md text-richblack-5 focus:outline-none focus:ring-2 focus:ring-yellow-50"
                placeholder="Enter class description"
              />
              {errors.description && (
                <p className="text-pink-200 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-richblack-5 mb-2">
                Select Course <span className="text-pink-200">*</span>
              </label>
              <select
                {...register('courseId', { required: 'Course selection is required' })}
                className="w-full px-3 py-2 bg-richblack-700 border border-richblack-600 rounded-md text-richblack-5 focus:outline-none focus:ring-2 focus:ring-yellow-50"
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseName}
                  </option>
                ))}
              </select>
              {errors.courseId && (
                <p className="text-pink-200 text-sm mt-1">{errors.courseId.message}</p>
              )}
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="block text-sm font-medium text-richblack-5 mb-2">
                Scheduled Time <span className="text-pink-200">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('scheduledTime', { required: 'Scheduled time is required' })}
                className="w-full px-3 py-2 bg-richblack-700 border border-richblack-600 rounded-md text-richblack-5 focus:outline-none focus:ring-2 focus:ring-yellow-50"
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.scheduledTime && (
                <p className="text-pink-200 text-sm mt-1">{errors.scheduledTime.message}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-richblack-5 mb-2">
                Duration (minutes) <span className="text-pink-200">*</span>
              </label>
              <input
                type="number"
                {...register('duration', { 
                  required: 'Duration is required',
                  min: { value: 15, message: 'Minimum duration is 15 minutes' },
                  max: { value: 480, message: 'Maximum duration is 8 hours' }
                })}
                className="w-full px-3 py-2 bg-richblack-700 border border-richblack-600 rounded-md text-richblack-5 focus:outline-none focus:ring-2 focus:ring-yellow-50"
                placeholder="60"
                min="15"
                max="480"
              />
              {errors.duration && (
                <p className="text-pink-200 text-sm mt-1">{errors.duration.message}</p>
              )}
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-medium text-richblack-5 mb-2">
                Maximum Participants
              </label>
              <input
                type="number"
                {...register('maxParticipants', { 
                  min: { value: 1, message: 'Minimum 1 participant required' },
                  max: { value: 1000, message: 'Maximum 1000 participants allowed' }
                })}
                className="w-full px-3 py-2 bg-richblack-700 border border-richblack-600 rounded-md text-richblack-5 focus:outline-none focus:ring-2 focus:ring-yellow-50"
                placeholder="100"
                min="1"
                max="1000"
              />
              {errors.maxParticipants && (
                <p className="text-pink-200 text-sm mt-1">{errors.maxParticipants.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => reset()}
                className="px-6 py-2 bg-richblack-700 text-richblack-5 rounded-md hover:bg-richblack-600 transition-colors"
              >
                Reset
              </button>
              <IconBtn
                text={loading ? 'Creating...' : 'Create Live Class'}
                disabled={loading}
                customClasses="bg-yellow-50 text-richblack-900 hover:bg-yellow-25"
              >
                <MdOutlineVideoCall />
              </IconBtn>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateLiveClass;
