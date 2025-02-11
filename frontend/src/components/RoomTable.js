import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function RoomTable() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/scan') // Update the URL if needed.
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRooms(data.data);
        } else {
          setError('Failed to load data.');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Room Videos</h2>
      <table
        border="1"
        cellPadding="10"
        cellSpacing="0"
        style={{
          width: '80%',
          margin: 'auto',
          borderCollapse: 'collapse',
          textAlign: 'left'
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>Name</th>
            <th>Video</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room, index) => (
            <tr key={index}>
              <td>
                {/* React Router Link for dynamic URL based on room name */}
                <Link
                  to={`/rooms/${encodeURIComponent(room.Name)}`}
                  style={{ textDecoration: 'none', color: 'blue' }}
                >
                  {room.Name}
                </Link>
              </td>
              <td>
                {room.Video ? (
                  <a
                    href={room.Video}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'blue' }}
                  >
                    Watch Video
                  </a>
                ) : (
                  'No Video'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
