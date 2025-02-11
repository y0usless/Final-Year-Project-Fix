import { useState, useEffect } from "react";

const VideoList = () => {
  const [roomName, setRoomName] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // ✅ Fetch videos from backend API
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/list-videos");
        if (!response.ok) {
          throw new Error("Failed to fetch videos");
        }
        const data = await response.json();
        console.log("🔹 Fetched Videos:", data); // ✅ Debugging log
        setVideos(data);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // ✅ Function to handle selecting a video
  const handleVideoSelect = (video) => {
    console.log("✅ Selected Video:", video); // ✅ Debugging log
    setSelectedVideo(video);
  };

  // ✅ Function to create a room
  const createRoom = async () => {
    if (!roomName || !selectedVideo) {
      alert("Please enter a room name and select a video.");
      return;
    }

    console.log("🔹 Selected Video URL Before Sending:", selectedVideo.videoUrl); // ✅ Debugging log

    setCreatingRoom(true);

    try {
      const response = await fetch("http://localhost:3001/api/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          videoUrl: selectedVideo.videoUrl, // ✅ Ensure this is correct
        }),
      });

      const result = await response.json();
      console.log("🔹 Server Response:", result); // ✅ Debugging log

      if (!response.ok) {
        throw new Error(result.error || "Failed to create room.");
      }

      alert(`Room "${roomName}" created successfully!`);
      setRoomName("");
      setSelectedVideo(null);
    } catch (error) {
      console.error("❌ Error creating room:", error);
      alert("Failed to create room.");
    } finally {
      setCreatingRoom(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">🎥 Select a Video & Create a Room</h2>

      {/* Room Name Input */}
      <input
        type="text"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Enter room name"
        className="border p-2 w-full mb-4 rounded"
      />

      {/* Video List */}
      {loading ? (
        <p>Loading videos...</p>
      ) : videos.length === 0 ? (
        <p>No videos available.</p>
      ) : (
        <ul className="border p-2 rounded bg-gray-100">
          {videos.map((video, index) => (
            <li
              key={index}
              className={`p-2 cursor-pointer border-b ${
                selectedVideo?.videoUrl === video.videoUrl
                  ? "bg-blue-500 text-white font-bold"
                  : "hover:bg-gray-200"
              }`}
              onClick={() => handleVideoSelect(video)}
            >
              {video.videoName}
            </li>
          ))}
        </ul>
      )}

      {/* Show Selected Video Name */}
      {selectedVideo && (
        <div className="mt-4 p-2 bg-gray-200 rounded">
          <h3 className="font-semibold">✅ Selected Video:</h3>
          <p className="text-blue-600 font-bold">{selectedVideo.videoName}</p>
        </div>
      )}

      {/* Create Room Button */}
      <button
        onClick={createRoom}
        disabled={creatingRoom || !roomName || !selectedVideo}
        className="mt-4 w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
      >
        {creatingRoom ? "Creating Room..." : "Create Room"}
      </button>
    </div>
  );
};

export default VideoList;
