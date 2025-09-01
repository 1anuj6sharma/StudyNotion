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

  // Comprehensive cleanup function that handles all resources
  const isCleanupCalled = useRef(false);
  
  const cleanup = useCallback(() => {
    // Prevent multiple cleanup calls
    if (isCleanupCalled.current) {
      console.log('Cleanup already called, skipping');
      return Promise.resolve();
    }
    isCleanupCalled.current = true;
    
    console.log('Starting cleanup...');
    
    return new Promise((resolve) => {
      try {
        // Clean up local media streams
        if (localStreamRef.current) {
          console.log('Stopping local stream tracks...');
          localStreamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
              if (track.onended) {
                track.onended = null;
              }
            } catch (err) {
              console.error('Error stopping track:', err);
            }
          });
          localStreamRef.current = null;
        }
        
        // Clean up video element
        if (localVideoRef.current) {
          console.log('Cleaning up video element...');
          localVideoRef.current.srcObject = null;
        }
        
        // Close WebRTC connection if it exists
        if (peerConnectionRef.current) {
          console.log('Closing peer connection...');
          try {
            peerConnectionRef.current.close();
          } catch (err) {
            console.error('Error closing peer connection:', err);
          }
          peerConnectionRef.current = null;
        }
        
        // Reset UI states
        setIsVideoEnabled(false);
        setIsAudioEnabled(false);
        
        console.log('Cleanup complete');
        resolve();
      } catch (error) {
        console.error('Error during cleanup:', error);
        resolve(); // Still resolve to prevent hanging
      }
    });
  }, [liveClass?._id, token]);

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
    // isInstructor is used in the function body, so it should be in the dependency array
    
    console.log(`initializeMedia called. isInstructor: ${isInstructor}, retryCount: ${retryCount}`);
    
    // Check if browser supports mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Your browser does not support camera/microphone access';
      console.error(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    
    // Always try to initialize media, but handle the case when no video is available
    const shouldTryVideo = isInstructor || retryCount > 0;
    let hasVideoDevices = true;
    
    try {
      // Check for available devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      hasVideoDevices = videoDevices.length > 0;
      
      if (!hasVideoDevices && shouldTryVideo) {
        console.warn('No video devices found, will try audio only');
        // If instructor but no video devices, show a warning but continue
        if (isInstructor) {
          toast('No camera found. You can continue with audio only.', {
            icon: '⚠️',
            duration: 5000
          });
        }
      }
    } catch (deviceError) {
      console.error('Error enumerating devices:', deviceError);
      // Continue anyway, we'll handle the error when trying to get the stream
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
      const constraintSets = [];
      
      // If we have video devices or we should try video, add video constraints
      if (hasVideoDevices && shouldTryVideo) {
        // Try with specific device if available
        if (videoDevices.length > 0) {
          constraintSets.push({
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
            } : true
          });
        }
        
        // Try ideal constraints
        constraintSets.push({
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
        });
        
        // Fallback to basic constraints
        constraintSets.push({
          video: {
            width: { min: 640 },
            height: { min: 480 },
            frameRate: { min: 15 },
            facingMode: 'user'
          },
          audio: true
        });
        
        // Most basic video constraints
        constraintSets.push({
          video: true,
          audio: true
        });
      }
      
      // Always add audio-only as a fallback
      constraintSets.push({
        video: false,
        audio: audioDevices.length > 0 ? {
          deviceId: audioDevices[0].deviceId ? { exact: audioDevices[0].deviceId } : true,
          echoCancellation: true,
          noiseSuppression: true
        } : true
      });
      
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
        
        // If we have more retries and it's a video-related error, try again
        if (retryCount < MAX_RETRIES && error.name !== 'NotAllowedError') {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return initializeMedia(retryCount + 1);
        }
        
        // If we've tried all constraints or got a permission error
        if (error.name === 'NotAllowedError') {
          toast.error('Please allow camera/microphone access to join the meeting');
        } else if (constraints.video) {
          // If we were trying to get video but failed, try audio only
          console.log('Falling back to audio only...');
          return initializeMedia(MAX_RETRIES); // Skip to audio-only mode
        } else {
          // If we're already in audio-only mode and still failing
          toast.error('Could not access your microphone. You can still join without audio.');
        }
        
        // If we get here, we couldn't get any media
        return false;
      }
      
      console.log('Media stream obtained');
      
      // Verify we have at least audio or video tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      if (videoTracks.length === 0 && audioTracks.length === 0) {
        throw new Error('No media tracks available');
      }
      
      // Store the stream reference
      localStreamRef.current = stream;
      
      // Handle video tracks
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        if (videoTrack.readyState === 'ended') {
          console.warn('Video track ended immediately');
          // Stop all video tracks but continue with audio if available
          videoTracks.forEach(track => track.stop());
        } else {
          console.log('Video track is active');
          // Set up video element if we have a working video track
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = new MediaStream([videoTrack]);
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(err => {
              console.error('Error playing video:', err);
              toast.error('Error starting video');
            });
          }
        }
      }
      
      // Handle audio tracks if no video is available
      if (videoTracks.length === 0 && audioTracks.length > 0 && localVideoRef.current) {
        // Show a placeholder since we don't have video
        localVideoRef.current.srcObject = null;
        localVideoRef.current.poster = '/images/audio-only-placeholder.png'; // Ensure this path exists in your public folder
        console.log('Audio-only mode activated');
      } else if (localVideoRef.current) {
        // Set video properties if we have a video element
        localVideoRef.current.playsInline = true;
        
        // Handle video play with timeout
        try {
          const playPromise = localVideoRef.current.play();
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
          toast.error('Could not start video');
          // Don't throw, continue with audio if available
          if (audioTracks.length === 0) {
            throw new Error('No usable media streams available');
          }
        }
      }
      
      // Update UI state based on available tracks
      setIsAudioEnabled(audioTracks.length > 0);
      setIsVideoEnabled(videoTracks.length > 0);
      
      // Set up track ended listeners
      const setupTrackListeners = () => {
        if (videoTracks.length > 0) {
          const videoTrack = videoTracks[0];
          videoTrack.onended = () => {
            console.warn('Video track ended');
            toast.warning('Camera disconnected');
            setIsVideoEnabled(false);
          };
        }
      };
      
      setupTrackListeners();

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
  }, [isInstructor, localStreamRef, localVideoRef]);

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
    
    // Call the async function
    init();
    
    // Setup track listeners
    const setupTrackListeners = () => {
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
          const track = videoTracks[0];
          track.enabled = !track.enabled;
          setIsVideoEnabled(track.enabled);
        }
      }
    };
    
    setupTrackListeners();
    
    // Cleanup function
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [setupWebRTC]);

  // Handle video toggle
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
      
      if (!idToUse) {
        console.error('No class ID available to leave');
        return;
      }
      
      console.log('Leaving meeting with class ID:', idToUse);
      
      // Call cleanup first to handle local resources
      await cleanup();
      
      // Then call the leave API
      await leaveLiveClassDirect(idToUse, token);
      
      // Navigate away after successful leave
      navigate('/dashboard/my-live-classes');
    } catch (error) {
      console.error('Error in leaveMeeting:', error);
      // Still navigate away even if there's an error
      navigate('/dashboard/my-live-classes');
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
                  'You'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className={`w-80 bg-richblack-800 border-l border-richblack-700 flex flex-col transition-all duration-300 ${isChatOpen ? 'block' : 'hidden lg:flex'}`}>
          <div className="p-4 border-b border-richblack-700 flex justify-between items-center">
            <h3 className="font-medium">Meeting Chat</h3>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="lg:hidden text-richblack-300 hover:text-white"
            >
              &times;
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 chat-messages">
            {chatMessages.length === 0 ? (
              <div className="text-center text-richblack-400 mt-8">
                <p>No messages yet</p>
                <p className="text-sm mt-1">Say hello to everyone!</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`mb-4 ${msg.isInstructor ? 'text-yellow-400' : 'text-white'}`}
                >
                  <div className="flex items-center mb-1">
                    <span className="font-medium">{msg.sender}</span>
                    {msg.isInstructor && (
                      <span className="ml-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                        Instructor
                      </span>
                    )}
                    <span className="text-xs text-richblack-400 ml-2">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-richblack-100">{msg.message}</p>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-richblack-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-richblack-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                onClick={sendMessage}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium px-4 py-2 rounded transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
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
