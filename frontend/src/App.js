import './App.css';
import Signup from './components/Signup';
import Login from './components/Login';
import { Account } from './components/Account';
import Status from './components/Status';
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import LoginPage from './components/LoginPage'; 
import WatchRoom from './components/WatchRoom';
import { useNavigate } from 'react-router-dom';
import io from "socket.io-client";
import Lobby from './components/Lobby';
import RoomPage from './components/RoomPage';

const socket = io.connect("http://localhost:3001")

function App() {
  return (
    <div>
      <Routes>
      <Route path="/" element={<Lobby socket={socket}/>} />
      <Route path="/rooms/:roomName" element={<RoomPage />} />
      </Routes>
    </div>
  );
}

export default App;
