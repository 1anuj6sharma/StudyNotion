import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { getLiveClassDetails, getLiveClassByRoomId, joinLiveClassDirect, leaveLiveClassDirect, updateClassStatus, updateParticipantStatus } from '../../../../services/operations/liveClassAPI';
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdCallEnd, MdChat, MdPeople } from 'react-icons/md';

// Video styles are now defined inline in the component

const MeetingRoom = () => {
  const { classId, roomId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  
  const [liveClass, setLiveClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInstructor, setIsInstructor] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  // socketRef is intentionally kept for future use

  const setupWebRTC = useCallback(() => {
    // Initialize WebRTC connection
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the candidate to the other peer
        console.log('ICE candidate:', event.candidate);
      }
    };

    // Add local stream to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  }, []);

  const fetchLiveClassDetails = useCallback(async () => {
    try {
      setLoading(true);
      let result;
      
      if (classId) {
        // Called from dashboard with classId
        result = await getLiveClassDetails(classId, token);
        if (result) {
          setLiveClass(result);
          // Check if current user is the instructor
          const isInstructorUser = result.instructor?._id === user?._id;
          setIsInstructor(isInstructorUser);
          
          // Join the live class
          await joinLiveClassDirect(classId, token);
          
          // Initialize WebRTC after joining
          if (isInstructorUser) {
            // Instructor will wait for participants to join
            setupWebRTC();
          } else {
            // Participant will connect to instructor
            setupWebRTC();
          }
        }
      } else if (roomId) {
        // Called from direct meeting URL with roomId
        result = await getLiveClassByRoomId(roomId, token);
        if (result) {
          setLiveClass(result);
          const isInstructorUser = result.instructor?._id === user?._id;
          setIsInstructor(isInstructorUser);
          
          // Join the live class using the class ID from the result
          await joinLiveClassDirect(result._id, token);
          
          // Initialize WebRTC after joining
          setupWebRTC();
        }
      } else {
        throw new Error('No class ID or room ID provided');
      }
    } catch (error) {
      console.error('Error fetching live class details:', error);
      toast.error('Failed to load live class');
      navigate('/dashboard/my-live-classes');
    } finally {
      setLoading(false);
    }
  }, [classId, roomId, token, navigate, user?._id, setupWebRTC]);

  const cleanup = useCallback(() => {
    // Clean up media streams and connections
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Update user status in the class
    if (liveClass?._id) {
      try {
        // Update status based on user role
        const status = user?.role === 'instructor' ? 'ended' : 'left';
        updateClassStatus(liveClass._id, status, token);
        
        // For students, also update participant status
        if (user?.role !== 'instructor') {
          updateParticipantStatus(liveClass._id, 'left', token);
        }
      } catch (error) {
        console.error('Error updating status:', error);
      }
      
      // Leave the class
      leaveLiveClassDirect(liveClass._id, token).catch(console.error);
    }
  }, [liveClass?._id, token, user?.role]);

  const checkCameraPermissions = async () => {
    try {
      const permissionResult = await navigator.permissions.query({ name: 'camera' });
      console.log('Camera permission state:', permissionResult.state);
      return permissionResult.state === 'granted';
    } catch (error) {
      console.log('Permission API not supported, continuing...');
      return true; // Assume granted if we can't check
    }
  };

  const initializeMedia = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1 second delay between retries
    
    console.log(`initializeMedia called. isInstructor: ${isInstructor}, retryCount: ${retryCount}`);
    
    // Check if we should initialize media based on role
    const shouldInitializeMedia = isInstructor || retryCount > 0;
    if (!shouldInitializeMedia) {
      console.log('Skipping media initialization for participant');
      return true;
    }
    
    // Check if browser supports mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Your browser does not support camera/microphone access';
      console.error(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    
    // Check camera permissions
    try {
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) {
        const permissionResult = await navigator.permissions.query({ name: 'camera' });
        console.log('Camera permission state:', permissionResult.state);
        
        if (permissionResult.state === 'prompt') {
          console.log('Requesting camera permission...');
          // This will trigger the permission prompt if not already granted
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getTracks().forEach(track => track.stop());
          return initializeMedia(retryCount); // Retry after permission is granted
        }
        
        toast.error('Please allow camera and microphone access to continue');
        return false;
      }
    } catch (permissionError) {
      console.error('Permission check error:', permissionError);
      toast.error('Error checking camera/microphone permissions');
      return false;
    }
    
    try {
      console.log(`Initializing media (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
      
      // Show loading state
      if (retryCount === 0) {
        toast.loading('Initializing camera...', { id: 'camera-init' });
      } else {
        toast.loading(`Trying different settings (${retryCount + 1}/${MAX_RETRIES + 1})...`, { id: 'camera-init' });
      }
      
      // First, stop any existing tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      console.log('Getting available devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);
      
      // Find available video and audio devices
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log(`Found ${videoDevices.length} video devices and ${audioDevices.length} audio devices`);
      
      // Different constraint sets to try
      const constraintSets = [
        // Try with specific device if available
        ...(videoDevices.length > 0 ? [{
          video: {
            deviceId: videoDevices[0].deviceId ? { exact: videoDevices[0].deviceId } : true,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: audioDevices.length > 0 ? {
            deviceId: audioDevices[0].deviceId ? { exact: audioDevices[0].deviceId } : true,
            echoCancellation: true,
            noiseSuppression: true
          } : false
        }] : []),
        // Try ideal constraints
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        },
        // Fallback to basic constraints
        {
          video: {
            width: { min: 640 },
            height: { min: 480 },
            frameRate: { min: 15 },
            facingMode: 'user'
          },
          audio: true
        },
        // Most basic constraints
        {
          video: true,
          audio: true
        }
      ];
      
      // Select the appropriate constraint set based on retry count
      const constraints = constraintSets[Math.min(retryCount, constraintSets.length - 1)];
      console.log('Trying with constraints:', constraints);
      
      console.log('Trying constraints:', JSON.stringify(constraints, null, 2));
      
      // Request media stream with timeout
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Successfully got media stream', stream);
      } catch (error) {
        console.error('Error getting media stream:', error);
        throw error;
      }
      
      console.log('Media stream obtained');
      
      // Verify we have video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video tracks available');
      }
      
      // Verify the video track is actually producing data
      const videoTrack = videoTracks[0];
      if (videoTrack.readyState === 'ended') {
        throw new Error('Video track ended immediately');
      }
      
      // Store the stream reference
      localStreamRef.current = stream;
      
      // Update video element
      if (localVideoRef.current) {
        const video = localVideoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        
        // Handle video play with timeout
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await Promise.race([
              playPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Video play timed out')), 2000)
              )
            ]);
          }
          console.log('Video is playing');
          toast.success('Camera connected!', { id: 'camera-init', duration: 2000 });
        } catch (playError) {
          console.error('Video play error:', playError);
          throw new Error('Could not play video');
        }
      }
      
      // Update UI state
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
      
      // Add event listener for track ended
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('Video track ended, trying to recover...');
          initializeMedia(0); // Restart with first constraint set
        };
      }
      
      return true; // Success
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // If we have retries left, try again with next constraint set
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return initializeMedia(retryCount + 1);
      }
      
      // All retries failed
      const errorMessage = error.message || 'Could not access camera/microphone';
      console.error('All retries failed:', errorMessage);
      toast.error(errorMessage, { id: 'camera-init' });
      
      // Update UI to show error state
      setIsVideoEnabled(false);
      
      return false; // Failure
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchLiveClassDetails();
        
        // Initialize media after fetching class details
        console.log('Initializing media...');
        const mediaInitialized = await initializeMedia();
        console.log('Media initialization', mediaInitialized ? 'succeeded' : 'failed');
        
        if (!mediaInitialized) {
          // If media initialization fails, show a retry button
          toast.error('Failed to initialize camera/microphone', {
            action: {
              label: 'Retry',
              onClick: () => initializeMedia()
            }
          });
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        toast.error('Failed to initialize meeting');
      }
    };
    
    init();
    
    return () => {
      cleanup();
    };
  }, [fetchLiveClassDetails, cleanup, initializeMedia]);

  // Handle camera toggle
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        track.enabled = !track.enabled;
        setIsVideoEnabled(track.enabled);
      }
    }
  };

  // Handle audio toggle
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        track.enabled = !track.enabled;
        setIsAudioEnabled(track.enabled);
      }
    }
  };

  const leaveMeeting = async () => {
    try {
      // Use the class ID from either the URL param or the fetched live class
      const idToUse = classId || liveClass?._id;
      if (idToUse) {
        await leaveLiveClassDirect(idToUse, token);
      }
      cleanup();
      navigate('/dashboard/my-live-classes');
    } catch (error) {
      console.log('Error leaving live class:', error);
      toast.error('Error leaving class');
    }
  };



  const sendMessage = useCallback(() => {
    if (newMessage.trim()) {
      // Get sender name with fallbacks
      let senderName = 'Anonymous';
      if (user?.firstName) {
        senderName = `${user.firstName} ${user.lastName || ''}`.trim();
      } else if (user?.email) {
        senderName = user.email.split('@')[0]; // Use username part of email
      }
      
      // Create a new message object with all necessary details
      const message = {
        id: Date.now(),
        sender: senderName,
        message: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isInstructor: isInstructor,
        userId: user?._id,
        avatar: user?.image || '',
        email: user?.email || ''
      };
      
      // Update chat messages
      setChatMessages(prevMessages => [...prevMessages, message]);
      setNewMessage('');
      
      // Auto-scroll to the latest message
      requestAnimationFrame(() => {
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      });
      
      // Here you would typically send the message to other participants via WebRTC or WebSocket
      // For now, we'll just log it
      console.log('Message sent:', message);
    }
  }, [newMessage, isInstructor, user]);

  if (loading) {
    return (
      <div className="bg-richblack-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p>Joining live class...</p>
        </div>
      </div>
    );
  }

  // Render video element with proper error handling
  const renderVideoElement = (videoRef, isLocal = true, label = '') => {
    return (
      <div className="relative w-full h-full bg-richblack-800 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
        />
        {!isVideoEnabled && isLocal && (
          <div className="absolute inset-0 bg-richblack-900/80 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-richblack-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <MdVideocamOff className="text-2xl text-richblack-300" />
              </div>
              <p className="text-richblack-200">Camera is off</p>
              <button
                onClick={toggleVideo}
                className="mt-2 px-4 py-2 bg-yellow-50 text-richblack-900 rounded-md text-sm font-medium hover:bg-yellow-100 transition-colors"
              >
                Turn on camera
              </button>
            </div>
          </div>
        )}
        {label && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-richblack-900 text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-richblack-800 p-4 border-b border-richblack-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">{liveClass?.title}</h1>
            <p className="text-richblack-300 text-sm">
              {isInstructor ? 'Instructor' : 'Participant'} | 
              Instructor: {liveClass?.instructor?.firstName} {liveClass?.instructor?.lastName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`${isInstructor ? 'bg-yellow-500' : 'bg-green-500'} text-white px-3 py-1 rounded-full text-sm`}>
              {isInstructor ? 'INSTRUCTOR' : 'PARTICIPANT'}
            </span>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2 ${isChatOpen ? 'bg-richblack-600' : 'bg-richblack-700'} hover:bg-richblack-600 rounded-md`}
            >
              <MdChat />
            </button>
            <button 
              className="p-2 bg-richblack-700 hover:bg-richblack-600 rounded-md"
              onClick={() => toast('Participant list coming soon', { type: 'info' })}
            >
              <MdPeople />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {/* Main Video - Shows instructor's stream for participants, local stream for instructor */}
            <div className="relative bg-richblack-800 rounded-lg overflow-hidden">
              {isInstructor ? (
                // Instructor view - shows their own camera
                renderVideoElement(
                  localVideoRef, 
                  true, 
                  'You (Instructor)'
                )
              ) : (
                // Participant view - shows instructor's stream
                renderVideoElement(
                  remoteVideoRef, 
                  false, 
                  liveClass?.instructor?.name || 'Instructor'
                )
              )}
            </div>

            {/* Secondary Video - Only shown for participants to see their own camera */}
            {!isInstructor && (
              <div className="relative bg-richblack-800 rounded-lg overflow-hidden">
                {renderVideoElement(
                  localVideoRef,
                  true,
                  'You (Participant)'
                )}
                <div className="absolute bottom-4 left-0 right-0 p-4">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => initializeMedia(0)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Retry Camera
                    </button>
                    <button 
                      onClick={toggleVideo}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      disabled={!localStreamRef.current}
                    >
                      {isVideoEnabled ? 'Turn Off' : 'Turn On'}
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-center text-gray-300">
                    <p>Media: {navigator.mediaDevices ? 'Supported' : 'Not Supported'}</p>
                    <p>Stream: {localStreamRef.current ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <div className="w-80 bg-richblack-800 border-l border-richblack-700 flex flex-col">
            <div className="p-4 border-b border-richblack-700">
              <h3 className="font-semibold">Chat</h3>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
              {chatMessages.map((msg) => {
                // Determine if message is from current user
                const isCurrentUser = msg.userId === user?._id;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-lg max-w-[85%] ${
                      isCurrentUser 
                        ? 'ml-auto bg-yellow-600/20 border border-yellow-600/30' 
                        : 'bg-richblack-700/80 border border-richblack-600/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {/* Avatar or Initials */}
                      {msg.avatar ? (
                        <img 
                          src={msg.avatar} 
                          alt={msg.sender} 
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-richblack-600 flex items-center justify-center text-xs text-richblack-100">
                          {msg.sender.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <span className={`font-medium ${
                        msg.isInstructor ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {msg.sender}
                        {isCurrentUser && ' (You)'}
                      </span>
                      
                      {msg.isInstructor && !isCurrentUser && (
                        <span className="text-xs bg-yellow-600/50 text-yellow-100 px-2 py-0.5 rounded-full">
                          Instructor
                        </span>
                      )}
                    </div>
                    <div className="text-richblack-100 mb-1 break-words">{msg.message}</div>
                    <div className="text-xs text-richblack-400 text-right">
                      {msg.timestamp}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t border-richblack-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-richblack-700 text-white px-3 py-2 rounded-md text-sm"
                />
                <button
                  onClick={sendMessage}
                  className="bg-yellow-50 text-richblack-900 px-4 py-2 rounded-md text-sm hover:bg-yellow-100"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-richblack-800 p-4 border-t border-richblack-700">
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled ? 'bg-richblack-700' : 'bg-red-500'
            } hover:opacity-80`}
          >
            {isAudioEnabled ? <MdMic /> : <MdMicOff />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled ? 'bg-richblack-700' : 'bg-red-500'
            } hover:opacity-80`}
          >
            {isVideoEnabled ? <MdVideocam /> : <MdVideocamOff />}
          </button>
          
          <button
            onClick={leaveMeeting}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600"
          >
            <MdCallEnd />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
