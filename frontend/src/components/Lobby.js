import Signup from './Signup';
import Login from './Login';
import { Account } from './Account';
import Status from './Status';
import VideoPlayer from './VideoPlayer';
import React, {useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import * as AWS from 'aws-sdk';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import RoomTable from './RoomTable';
import VideoUploader from './VideoUploader';
import VideoList from './VideoList';


function Lobby({socket}) {
  const [storingVideos, setStoringVideos] = useState(true);

  useEffect(() => {
    const storeVideos = async () => {
      try {
        console.log("🔹 Storing videos from S3 to DynamoDB...");
        const response = await fetch("http://localhost:3001/api/store-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to store videos");
        }

        console.log("✅ Videos successfully stored in DynamoDB");
      } catch (error) {
        console.error("❌ Error storing videos:", error);
      } finally {
        setStoringVideos(false); // ✅ Stop loading once complete
      }
    };

    storeVideos();
  }, []); 
  return (
      
        // <div className="joinChatContainer">
        //   <h1>{data ? data : "Loading"}</h1>
        //   <h3>Join A Room</h3>
        //   <input
        //     type="text"
        //     placeholder="John..."
        //     onChange={(event) => {
        //       setUsername(event.target.value);
        //     } } />
        //   <input
        //     type="text"
        //     placeholder="Room ID..."
        //     onChange={(event) => {
        //       setRoom(event.target.value);
        //     } } />
        //   <button onClick={onSubmit}>Join A Room</button>
        // </div>
        <div>
        <RoomTable/>
        <VideoUploader/>
        <VideoList/>
    </div>

      
      
  );
}

export default Lobby;
