import Signup from './Signup';
import Login from './Login';
import { Account } from './Account';
import Status from './Status';
import VideoPlayer from './VideoPlayer';
import React, {useState} from "react";


function WatchRoom({socket}) {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", room);
    }
  }
  return (
    <><div className="App">
      
        <div className="joinChatContainer">
          <h3>Join A Room</h3>
          <input
            type="text"
            placeholder="John..."
            onChange={(event) => {
              setUsername(event.target.value);
            } } />
          <input
            type="text"
            placeholder="Room ID..."
            onChange={(event) => {
              setRoom(event.target.value);
            } } />
          <button onClick={joinRoom}>Join A Room</button>
        </div>
      
      
    </div>
    <VideoPlayer socket={socket}/></>
    // <div className="App">
    //   <h2>Watch Party</h2>
    //   <video width="700px" height="400px" controls ref={this.handleVideoMounted}>
    //     <source src="https://d16npienajkelb.cloudfront.net/COSTA%20RICA%20IN%204K%2060fps%20HDR%20(ULTRA%20HD).mp4" type="video/mp4" />
    //   </video>
    // </div>
  );
}

export default WatchRoom;
