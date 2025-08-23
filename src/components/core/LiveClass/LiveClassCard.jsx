// src/components/core/LiveClass/LiveClassCard.jsx
import React from 'react';
import { formatDate } from '../../../utils/dateFormatter';

const LiveClassCard = ({ liveClass, onJoin, userRole }) => {
  const { title, description, instructor, scheduledAt, status, attendees, maxAttendees } = liveClass;
  
  const isLive = status === 'live';
  const isUpcoming = status === 'scheduled';
  const attendeeCount = attendees?.filter(a => !a.leftAt).length || 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isLive ? 'bg-red-100 text-red-800' : 
          isUpcoming ? 'bg-green-100 text-green-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          {status.toUpperCase()}
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Instructor:</span> {instructor?.firstName} {instructor?.lastName}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Scheduled:</span> {formatDate(scheduledAt)}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Attendees:</span> {attendeeCount}/{maxAttendees}
        </p>
      </div>
      
      {userRole === 'Student' && (isLive || isUpcoming) && (
        <button
          onClick={() => onJoin(liveClass._id)}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isLive 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLive ? 'Join Live Class' : 'Join When Live'}
        </button>
      )}
    </div>
  );
};

export default LiveClassCard;
