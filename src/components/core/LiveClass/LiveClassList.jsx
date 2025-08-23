// src/components/core/LiveClass/LiveClassList.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUpcomingClasses, joinLiveClass } from '../../../services/operations/liveClassAPI';
import LiveClassCard from './LiveClassCard';

const LiveClassList = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { token } = useSelector(state => state.auth);
  const { user } = useSelector(state => state.profile);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const result = await dispatch(getUpcomingClasses());
      setClasses(result || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
    setLoading(false);
  };

  const handleJoinClass = async (classId) => {
    try {
      const result = await dispatch(joinLiveClass(classId, token));
      if (result?.meetingUrl) {
        window.open(result.meetingUrl, '_blank');
      }
      fetchClasses(); // Refresh the list
    } catch (error) {
      console.error('Error joining class:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Upcoming Live Classes</h2>
      
      {classes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No upcoming live classes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((liveClass) => (
            <LiveClassCard
              key={liveClass._id}
              liveClass={liveClass}
              onJoin={handleJoinClass}
              userRole={user?.accountType}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveClassList;
