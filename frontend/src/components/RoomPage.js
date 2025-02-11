// RoomPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

export default function RoomPage() {
  const { roomName } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  const socketRef = useRef(null);

  // Flag to indicate that a remote seek update is being applied.
  const isRemoteUpdate = useRef(false);
  // Timestamp of the last local seek event emission (to throttle the events).
  const lastSeekEmitTime = useRef(0);

  // Fetch room data (video URL, etc.) from your /scan endpoint.
  useEffect(() => {
    fetch('http://localhost:3001/scan')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Find the room whose Name attribute matches the roomName parameter.
          const foundRoom = data.data.find((r) => r.Name === roomName);
          if (foundRoom) {
            setRoom(foundRoom);
          } else {
            setError('Room not found.');
          }
        } else {
          setError('Error fetching room data.');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [roomName]);

  // Set up Socket.IO connection and event listeners.
  useEffect(() => {
    socketRef.current = io('http://localhost:3001'); // Adjust URL if needed.
    socketRef.current.emit('join-room', roomName);
    console.log(`Joined room ${roomName}`);

    // When receiving a sync-video event, update the video accordingly.
    // Inside your useEffect that sets up the Socket.IO event listeners:

// Updated sync-video event handler
// Within your useEffect that sets up your Socket.IO event listeners:
socketRef.current.on('sync-video', (data) => {
    console.log('Received sync-video:', data);
    if (videoRef.current) {
      if (videoRef.current.readyState >= 3) {
        // The video is already ready, so sync immediately.
        console.log('Video is already ready. Syncing now.');
        onCanPlaySync(data);
      } else {
        // Video isn’t ready yet; wait for the canplay event.
        videoRef.current.addEventListener('canplay', function handler() {
          console.log('canplay event fired. Syncing now.');
          onCanPlaySync(data);
          videoRef.current.removeEventListener('canplay', handler);
        });
      }
    }
  });

  const onCanPlaySync = (data) => {
    // Pause and update the currentTime, then resume if needed.
    videoRef.current.pause();
    videoRef.current.currentTime = data.currentTime;
    if (data.playing) {
      videoRef.current.play().catch((err) => {
        console.log('Playback error after sync:', err);
      });
    }
  };
  
  
  

    // Listen for remote play events.
    socketRef.current.on('video-play', (data) => {
      console.log('Received video-play:', data);
      if (videoRef.current) {
        if (Math.abs(videoRef.current.currentTime - data.currentTime) > 0.5) {
          videoRef.current.currentTime = data.currentTime;
        }
        videoRef.current.play();
      }
    });

    // Listen for remote pause events.
    socketRef.current.on('video-pause', (data) => {
      console.log('Received video-pause:', data);
      if (videoRef.current) {
        if (Math.abs(videoRef.current.currentTime - data.currentTime) > 0.5) {
          videoRef.current.currentTime = data.currentTime;
        }
        videoRef.current.pause();
      }
    });

    // Listen for remote seek events.
    socketRef.current.on('video-seek', (data) => {
      console.log('Received video-seek:', data);
      if (videoRef.current) {
        // Mark the update as remote so that the local onSeeked handler ignores it.
        isRemoteUpdate.current = true;
        videoRef.current.currentTime = data.currentTime;
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomName]);

  // Local event handlers that emit events to the server.

  const handlePlay = () => {
    if (videoRef.current && socketRef.current) {
      const currentTime = videoRef.current.currentTime;
      console.log('Emitting video-play:', currentTime);
      socketRef.current.emit('video-play', { room: roomName, currentTime });
    }
  };

  const handlePause = () => {
    if (videoRef.current && socketRef.current) {
      const currentTime = videoRef.current.currentTime;
      console.log('Emitting video-pause:', currentTime);
      socketRef.current.emit('video-pause', { room: roomName, currentTime });
    }
  };

  const handleSeeked = () => {
    // If the seek event was triggered by a remote update, ignore it.
    if (isRemoteUpdate.current) {
      console.log('Ignoring remote seek update.');
      isRemoteUpdate.current = false;
      return;
    }
    // Throttle seek events to avoid spamming (e.g., only emit if 200ms have passed).
    const now = Date.now();
    if (now - lastSeekEmitTime.current < 200) {
      console.log('Seek event throttled.');
      return;
    }
    lastSeekEmitTime.current = now;
    if (videoRef.current && socketRef.current) {
      const currentTime = videoRef.current.currentTime;
      console.log('Emitting video-seek:', currentTime);
      socketRef.current.emit('video-seek', { room: roomName, currentTime });
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!room) return <p>No room data available.</p>;

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Room: {roomName}</h2>
      <p>Video is fully synced for all users in this room.</p>
      {room.Video ? (
        <video
        ref={videoRef}
        width="600"
        controls
        muted
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
      >
        <source src={room.Video} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      ) : (
        <p>No video available for this room.</p>
      )}
      <br />
      <Link to="/" style={{ textDecoration: 'none', color: 'blue' }}>
        Back to Rooms List
      </Link>
    </div>
  );
}
