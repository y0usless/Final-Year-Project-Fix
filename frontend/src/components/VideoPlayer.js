import { useEffect, useRef, useState } from "react";
import { IconContext } from "react-icons";
import { BiPlay, BiSkipNext, BiSkipPrevious, BiPause } from "react-icons/bi";

function VideoPlayer({socket}, data) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState([0, 0]);
  const [currentTimeSec, setCurrentTimeSec] = useState();
  const [duration, setDuration] = useState([0, 0]);
  const [durationSec, setDurationSec] = useState();

  const sec2Min = (sec) => {
    const min = Math.floor(sec / 60);
    const secRemain = Math.floor(sec % 60);
    return {
      min: min,
      sec: secRemain
    };
  };


  useEffect(() => {
    const { min, sec } = sec2Min(videoRef.current.duration);
    setDurationSec(videoRef.current.duration);
    setDuration([min, sec]);

    console.log(videoRef.current.duration);
    const interval = setInterval(() => {
      const { min, sec } = sec2Min(videoRef.current.currentTime);
      setCurrentTimeSec(videoRef.current.currentTime);
      setCurrentTime([min, sec]);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlay = async () => {
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      await socket.emit("pause", data);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    socket.on("receivePause", (data) => {
      setIsPlaying(false);
      videoRef.current.pause();
      console.log("pause")
    });
    console.log();
  }, [socket])


  return (
    <div className="container">
      <div className="playerContainer">
        <video className="videoPlayer" ref={videoRef} src="https://d16npienajkelb.cloudfront.net/COSTA%20RICA%20IN%204K%2060fps%20HDR%20(ULTRA%20HD).mp4"></video>
        <div className="controlsContainer">
          <div className="controls">
            <IconContext.Provider value={{ color: "white", size: "2em" }}>
              <BiSkipPrevious />
            </IconContext.Provider>
            {isPlaying ? (
              <button className="controlButton" onClick={handlePlay}>
                <IconContext.Provider value={{ color: "white", size: "2em" }}>
                  <BiPause />
                </IconContext.Provider>
              </button>
            ) : (
              <button className="controlButton" onClick={handlePlay}>
                <IconContext.Provider value={{ color: "white", size: "2em" }}>
                  <BiPlay />
                </IconContext.Provider>
              </button>
            )}
            <IconContext.Provider value={{ color: "white", size: "2em" }}>
              <BiSkipNext />
            </IconContext.Provider>
            <div className="duration">
              {currentTime[0]}:{currentTime[1]} / {duration[0]}:{duration[1]}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={durationSec}
            default="0"
            value={currentTimeSec}
            className="timeline"
            onChange={(e) => {
              videoRef.current.currentTime = e.target.value;
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
