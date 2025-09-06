import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getUpcomingClasses } from '../../../../services/operations/liveClassAPI';
import { formatDate } from '../../../../utils/dateFormatter';
import IconBtn from '../../../common/IconBtn';
import { MdVideoCall, MdPeople, MdSchool } from 'react-icons/md';
import { FiClock, FiCalendar } from 'react-icons/fi';

const MyLiveClasses = () => {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningClass, setJoiningClass] = useState(null);

  const [error, setError] = useState(null);

  const fetchUpcomingClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getUpcomingClasses(token);
      setUpcomingClasses(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error fetching upcoming classes:', error);
      setError(error.message || 'Failed to fetch upcoming classes');
      setUpcomingClasses([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUpcomingClasses();
  }, [fetchUpcomingClasses]);

  const handleJoinClass = async (classId) => {
    try {
      setJoiningClass(classId);
      // Navigate directly to meeting room
      navigate(`/dashboard/meeting/${classId}`);
    } catch (error) {
      console.log('Error joining live class:', error);
      toast.error('Failed to join live class');
    } finally {
      setJoiningClass(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-400 bg-blue-400/10';
      case 'live':
        return 'text-green-400 bg-green-400/10';
      case 'completed':
        return 'text-gray-400 bg-gray-400/10';
      case 'cancelled':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const isClassLive = (scheduledAt, duration) => {
    const now = new Date();
    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    return now >= startTime && now <= endTime;
  };

  const isClassStartingSoon = (scheduledAt) => {
    const now = new Date();
    const startTime = new Date(scheduledAt);
    const timeDiff = startTime.getTime() - now.getTime();
    return timeDiff > 0 && timeDiff <= 15 * 60 * 1000; // 15 minutes
  };

  const getTimeUntilClass = (scheduledAt) => {
    const now = new Date();
    const startTime = new Date(scheduledAt);
    const timeDiff = startTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) return 'Started';
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    }
    return `Starts in ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-richblack-900 text-white min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-richblack-5 mb-8">My Live Classes</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-richblack-900 text-white min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-richblack-5 mb-8">My Live Classes</h1>
          <div className="bg-richblack-800 p-6 rounded-lg border border-richblack-700">
            <div className="text-center py-12">
              <div className="text-yellow-400 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-richblack-100 mb-2">Error Loading Classes</h2>
              <p className="text-richblack-300 mb-6">{error}</p>
              <button
                onClick={fetchUpcomingClasses}
                className="px-6 py-2 bg-yellow-50 text-richblack-900 font-medium rounded-lg hover:bg-yellow-100 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (!loading && upcomingClasses.length === 0) {
    return (
      <div className="bg-richblack-900 text-white min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-richblack-5 mb-8">My Live Classes</h1>
          <div className="bg-richblack-800 p-6 rounded-lg border border-richblack-700">
            <div className="text-center py-12">
              <div className="text-blue-400 text-5xl mb-4">📅</div>
              <h2 className="text-xl font-semibold text-richblack-100 mb-2">No Upcoming Classes</h2>
              <p className="text-richblack-300">You don't have any upcoming live classes scheduled.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-richblack-900 text-white min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-richblack-5 mb-2">
            My Live Classes
          </h1>
          <p className="text-richblack-300">
            Join your upcoming live classes
          </p>
        </div>

        {upcomingClasses.length === 0 ? (
          <div className="bg-richblack-800 rounded-lg p-8 text-center border border-richblack-700">
            <MdVideoCall className="mx-auto text-6xl text-richblack-400 mb-4" />
            <h3 className="text-xl font-semibold text-richblack-5 mb-2">
              No Upcoming Classes
            </h3>
            <p className="text-richblack-300 mb-4">
              You don't have any upcoming live classes scheduled
            </p>
            <IconBtn
              text="Browse Courses"
              onclick={() => window.location.href = '/catalog'}
              customClasses="bg-yellow-50 text-richblack-900 hover:bg-yellow-25"
            >
              <MdSchool />
            </IconBtn>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Live Classes */}
            {upcomingClasses.filter(cls => isClassLive(cls.scheduledTime, cls.duration)).length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-richblack-5 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                  Live Now
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingClasses
                    .filter(cls => isClassLive(cls.scheduledAt, cls.duration))
                    .map((liveClass) => (
                      <div
                        key={liveClass._id}
                        className="bg-richblack-800 rounded-lg p-6 border-2 border-green-500 hover:border-green-400 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-semibold text-richblack-5 line-clamp-2">
                            {liveClass.title}
                          </h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-400/10 animate-pulse">
                            LIVE
                          </span>
                        </div>

                        <p className="text-richblack-300 text-sm mb-4 line-clamp-3">
                          {liveClass.description}
                        </p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-richblack-300">
                            <MdSchool className="mr-2" />
                            {liveClass.course?.courseName}
                          </div>
                          <div className="flex items-center text-sm text-richblack-300">
                            <MdPeople className="mr-2" />
                            {liveClass.participants?.length || 0} participants
                          </div>
                        </div>

                        <IconBtn
                          text={joiningClass === liveClass._id ? 'Joining...' : 'Join Now'}
                          onclick={() => handleJoinClass(liveClass._id)}
                          disabled={joiningClass === liveClass._id}
                          customClasses="w-full bg-green-500 text-white hover:bg-green-600"
                        >
                          <MdVideoCall />
                        </IconBtn>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Starting Soon */}
            {upcomingClasses.filter(cls => isClassStartingSoon(cls.scheduledTime)).length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-richblack-5 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  Starting Soon
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingClasses
                    .filter(cls => isClassStartingSoon(cls.scheduledTime))
                    .map((liveClass) => (
                      <div
                        key={liveClass._id}
                        className="bg-richblack-800 rounded-lg p-6 border-2 border-yellow-500 hover:border-yellow-400 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-semibold text-richblack-5 line-clamp-2">
                            {liveClass.title}
                          </h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-yellow-400 bg-yellow-400/10">
                            {getTimeUntilClass(liveClass.scheduledAt)}
                          </span>
                        </div>

                        <p className="text-richblack-300 text-sm mb-4 line-clamp-3">
                          {liveClass.description}
                        </p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-richblack-300">
                            <FiCalendar className="mr-2" />
                            {formatDate(liveClass.scheduledAt)}
                          </div>
                          <div className="flex items-center text-sm text-richblack-300">
                            <FiClock className="mr-2" />
                            {liveClass.duration} minutes
                          </div>
                          <div className="flex items-center text-sm text-richblack-300">
                            <MdSchool className="mr-2" />
                            {liveClass.course?.courseName}
                          </div>
                        </div>

                        <button
                          className="w-full px-4 py-2 bg-yellow-50 text-richblack-900 rounded-md hover:bg-yellow-25 transition-colors font-medium"
                          disabled
                        >
                          Waiting to Start
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Upcoming Classes */}
            {upcomingClasses.filter(cls => !isClassLive(cls.scheduledAt, cls.duration) && !isClassStartingSoon(cls.scheduledAt)).length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-richblack-5 mb-4">
                  Upcoming Classes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingClasses
                    .filter(cls => !isClassLive(cls.scheduledAt, cls.duration) && !isClassStartingSoon(cls.scheduledAt))
                    .map((liveClass) => (
                      <div
                        key={liveClass._id}
                        className="bg-richblack-800 rounded-lg p-6 border border-richblack-700 hover:border-richblack-600 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-semibold text-richblack-5 line-clamp-2">
                            {liveClass.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              liveClass.status
                            )}`}
                          >
                            {liveClass.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-richblack-300 text-sm mb-4 line-clamp-3">
                          {liveClass.description}
                        </p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-richblack-300">
                            <FiCalendar className="mr-2" />
                            {formatDate(liveClass.scheduledAt)}
                          </div>
                          <div className="flex items-center text-sm text-richblack-300">
                            <FiClock className="mr-2" />
                            {liveClass.duration} minutes
                          </div>
                          <div className="flex items-center text-sm text-richblack-300">
                            <MdSchool className="mr-2" />
                            {liveClass.course?.courseName}
                          </div>
                        </div>

                        <div className="text-center text-sm text-richblack-400">
                          {getTimeUntilClass(liveClass.scheduledAt)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLiveClasses;
