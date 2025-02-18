// RoomPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

export default function RoomPage() {
  const { roomName } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInitiated, setUserInitiated] = useState(false);
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  // Fetch room data (video URL, etc.) from /scan endpoint backed by DynamoDB.
  useEffect(() => {
    fetch('http://localhost:3001/scan')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Find the room with matching Name
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

  // Set up Socket.IO connection and event listeners after the user gesture.
  useEffect(() => {
    if (!userInitiated) return; // Do nothing until user clicks the overlay

    // Connect to the Socket.IO server.
    socketRef.current = io('http://localhost:3001'); // Adjust URL if needed.
    socketRef.current.emit('join-room', roomName);
    console.log(`Joined room ${roomName}`);

    // When receiving a sync-video event, force the video to sync.
    socketRef.current.on('sync-video', (data) => {
      console.log('Received sync-video:', data);
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        const diff = Math.abs(currentTime - data.currentTime);
        if (diff > 0.5 || (data.playing !== !videoRef.current.paused)) {
          console.log(`Syncing video from ${currentTime} to ${data.currentTime}`);
          isRemoteUpdate.current = true;
          videoRef.current.pause();
          videoRef.current.currentTime = data.currentTime;
          setTimeout(() => {
            if (data.playing) {
              videoRef.current.play().catch((err) => console.log('Error playing after sync:', err));
            }
            isRemoteUpdate.current = false;
          }, 100);
        } else {
          console.log('Video already in sync.');
        }
      }
    });

    // Handle remote play event.
    socketRef.current.on('video-play', (data) => {
      console.log('Received video-play:', data);
      if (videoRef.current) {
        const diff = Math.abs(videoRef.current.currentTime - data.currentTime);
        if (diff > 0.5) {
          isRemoteUpdate.current = true;
          videoRef.current.pause();
          videoRef.current.currentTime = data.currentTime;
          videoRef.current.play();
          setTimeout(() => (isRemoteUpdate.current = false), 100);
        } else {
          videoRef.current.play();
        }
      }
    });

    // Handle remote pause event.
    socketRef.current.on('video-pause', (data) => {
      console.log('Received video-pause:', data);
      if (videoRef.current) {
        const diff = Math.abs(videoRef.current.currentTime - data.currentTime);
        if (diff > 0.5) {
          isRemoteUpdate.current = true;
          videoRef.current.pause();
          videoRef.current.currentTime = data.currentTime;
          setTimeout(() => (isRemoteUpdate.current = false), 100);
        } else {
          videoRef.current.pause();
        }
      }
    });

    // Handle remote seek event.
    socketRef.current.on('video-seek', (data) => {
      console.log('Received video-seek:', data);
      if (videoRef.current) {
        isRemoteUpdate.current = true;
        videoRef.current.currentTime = data.currentTime;
        setTimeout(() => (isRemoteUpdate.current = false), 100);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomName, userInitiated]);

  // Local event handlers that emit events if not caused by remote updates.
  const handlePlay = () => {
    if (videoRef.current && socketRef.current && !isRemoteUpdate.current) {
      const currentTime = videoRef.current.currentTime;
      console.log('Emitting video-play:', currentTime);
      socketRef.current.emit('video-play', { room: roomName, currentTime });
    }
  };

  const handlePause = () => {
    if (videoRef.current && socketRef.current && !isRemoteUpdate.current) {
      const currentTime = videoRef.current.currentTime;
      console.log('Emitting video-pause:', currentTime);
      socketRef.current.emit('video-pause', { room: roomName, currentTime });
    }
  };

  const handleSeeked = () => {
    if (videoRef.current && socketRef.current) {
      if (isRemoteUpdate.current) {
        console.log('Ignoring remote seek update.');
        return;
      }
      const currentTime = videoRef.current.currentTime;
      console.log('Emitting video-seek:', currentTime);
      socketRef.current.emit('video-seek', { room: roomName, currentTime });
    }
  };

  // This function is called when the user clicks the overlay button.
  const handleUserGesture = () => {
    setUserInitiated(true);
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        console.log('User gesture accepted, video started.');
      }).catch(err => {
        console.log('Error playing video after user gesture:', err);
      });
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!room) return <p>No room data available.</p>;

  return (
    <div style={{ padding: '20px', textAlign: 'center', position: 'relative' }}>
      <h2>Room: {roomName}</h2>
      <p>Video is synced for all users in this room.</p>
      {room.Video ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <video
            ref={videoRef}
            width="600"
            controls
            muted  // Include muted to help bypass autoplay restrictions (remove if audio is needed)
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={handleSeeked}
          >
            <source src={room.Video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {/* Overlay that prompts the user for a gesture */}
          {!userInitiated && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                cursor: 'pointer'
              }}
              onClick={handleUserGesture}
            >
              Click to Sync and Play
            </div>
          )}
        </div>
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
