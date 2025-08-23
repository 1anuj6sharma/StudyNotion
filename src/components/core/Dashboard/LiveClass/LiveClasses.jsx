import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { getInstructorClasses, deleteLiveClass, startLiveClass } from '../../../../services/operations/liveClassAPI';
import { formatDate } from '../../../../utils/dateFormatter';
import IconBtn from '../../../common/IconBtn';
import ConfirmationModal from '../../../common/ConfirmationModal';
import { MdEdit, MdDelete, MdVideoCall, MdPeople } from 'react-icons/md';
import { FiClock, FiCalendar } from 'react-icons/fi';

const LiveClasses = () => {
  const { token } = useSelector((state) => state.auth);
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmationModal, setConfirmationModal] = useState(null);

  const fetchLiveClasses = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getInstructorClasses(token);
      if (result) {
        setLiveClasses(result);
      }
    } catch (error) {
      console.log('Error fetching live classes:', error);
      toast.error('Failed to fetch live classes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLiveClasses();
  }, [fetchLiveClasses]);

  const handleDeleteClass = async (classId) => {
    try {
      const result = await deleteLiveClass(classId, token);
      if (result) {
        setLiveClasses(liveClasses.filter(cls => cls._id !== classId));
        toast.success('Live class deleted successfully');
      }
    } catch (error) {
      console.log('Error deleting live class:', error);
      // Show specific error message from backend
      const errorMessage = error.response?.data?.message || 'Failed to delete live class';
      toast.error(errorMessage);
    }
    setConfirmationModal(null);
  };

  const handleStartClass = async (classId) => {
    try {
      const result = await startLiveClass(classId, token);
      if (result) {
        // Update the class status to 'live' in the local state
        setLiveClasses(liveClasses.map(cls => 
          cls._id === classId ? { ...cls, status: 'live' } : cls
        ));
        // Open the meeting URL
        window.open(result.meetingUrl, '_blank');
      }
    } catch (error) {
      console.log('Error starting live class:', error);
      toast.error('Failed to start live class');
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


  if (loading) {
    return (
      <div className="bg-richblack-900 text-white min-h-screen p-6">
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-richblack-900 text-white min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-richblack-5 mb-2">
              Live Classes
            </h1>
            <p className="text-richblack-300">
              Manage your scheduled live classes
            </p>
          </div>
          <IconBtn
            text="Create New Class"
            onclick={() => window.location.href = '/dashboard/create-live-class'}
            customClasses="bg-yellow-50 text-richblack-900 hover:bg-yellow-25"
          >
            <MdVideoCall />
          </IconBtn>
        </div>

        {liveClasses.length === 0 ? (
          <div className="bg-richblack-800 rounded-lg p-8 text-center border border-richblack-700">
            <MdVideoCall className="mx-auto text-6xl text-richblack-400 mb-4" />
            <h3 className="text-xl font-semibold text-richblack-5 mb-2">
              No Live Classes Yet
            </h3>
            <p className="text-richblack-300 mb-4">
              Create your first live class to get started
            </p>
            <IconBtn
              text="Create Live Class"
              onclick={() => window.location.href = '/dashboard/create-live-class'}
              customClasses="bg-yellow-50 text-richblack-900 hover:bg-yellow-25"
            >
              <MdVideoCall />
            </IconBtn>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveClasses.map((liveClass) => (
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
                    <MdPeople className="mr-2" />
                    {liveClass.attendees?.length || 0} / {liveClass.maxAttendees || 'Unlimited'} participants
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      className="p-2 bg-richblack-700 hover:bg-richblack-600 rounded-md transition-colors"
                      title="Edit Class"
                    >
                      <MdEdit className="text-richblack-300" />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmationModal({
                          text1: 'Delete Live Class?',
                          text2: 'This action cannot be undone.',
                          btn1Text: 'Delete',
                          btn2Text: 'Cancel',
                          btn1Handler: () => handleDeleteClass(liveClass._id),
                          btn2Handler: () => setConfirmationModal(null),
                        })
                      }
                      className="p-2 bg-richblack-700 hover:bg-red-600 rounded-md transition-colors"
                      title="Delete Class"
                    >
                      <MdDelete className="text-richblack-300" />
                    </button>
                  </div>

                  <div className="flex space-x-2">
                    {liveClass.status === 'scheduled' && (
                      <IconBtn
                        text="Start Class"
                        onclick={() => handleStartClass(liveClass._id)}
                        customClasses="bg-green-500 text-white hover:bg-green-600 text-sm px-3 py-1"
                      >
                        <MdVideoCall />
                      </IconBtn>
                    )}
                    {liveClass.status === 'live' && (
                      <IconBtn
                        text="Join Live"
                        onclick={() => window.open(liveClass.meetingUrl, '_blank')}
                        customClasses="bg-blue-500 text-white hover:bg-blue-600 text-sm px-3 py-1"
                      >
                        <MdVideoCall />
                      </IconBtn>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </div>
  );
};

export default LiveClasses;
