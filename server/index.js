// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { DynamoDBClient, ScanCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client, PutObjectCommand, ListObjectsV2Command} = require('@aws-sdk/client-s3')
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();

// Use the cors middleware to allow cross-origin requests.
// You can restrict the allowed origins as needed (for now we allow all).
app.use(cors());
app.use(express.json());

const server = http.createServer(app);


// Create a Socket.IO server with CORS settings.
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',           // Allow all origins for testing. In production, restrict this.
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ["Content-Type", "Authorization"] // Allowed methods.
  },
});

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
})

const s3 = new S3Client({
  region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
})
// Initialize DynamoDB client (adjust region as needed)
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(console.error);

const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO Redis adapter is set up');
  })
  .catch(console.error);

async function getRoomState(room) {
  const state = await redisClient.get(`roomState:${room}`);
  return state ? JSON.parse(state) : null;
}

async function setRoomState(room, state) {
  // Set the state with a TTL of 3600 seconds (1 hour)
  await redisClient.set(`roomState:${room}`, JSON.stringify(state), { EX: 3600 });
}

// In‑memory store for room playback state.
const roomStates = {};

const upload = multer({
  storage: multerS3({
      s3: s3,
      bucket: process.env.AWS_S3_BUCKET,
      acl: 'public-read', // Set ACL for public access
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
          const fileName = `${Date.now()}-${file.originalname}`;
          cb(null, fileName);
      }
  })
});

const storeVideosInDynamoDB = async () => {
  try {
    console.log("🔹 Fetching videos from S3...");

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
    });

    const response = await s3.send(command);
    const videos = response.Contents || [];

    console.log(`✅ Found ${videos.length} videos in S3`); // ✅ Check if S3 found videos
    if (videos.length === 0) {
      console.log("⚠️ No videos found in S3. Make sure you have uploaded videos.");
      return;
    }

    for (const video of videos) {
      const VideoName = video.Key;
      const VideoLink = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${VideoName}`;

      console.log(`📌 Storing in DynamoDB: ${VideoName} → ${VideoLink}`); // ✅ Log every video

      const putCommand = new PutItemCommand({
        TableName: process.env.DYNAMODB_TABLE_VID,
        Item: {
          VideoName: { S: VideoName }, // Required: DynamoDB string format
          VideoLink: { S: VideoLink },
          uploadedAt: { S: new Date().toISOString() },
        },
      });

      await dynamoClient.send(putCommand);
    }

    console.log("✅ All videos stored in DynamoDB!");
  } catch (error) {
    console.error("❌ Error storing videos in DynamoDB:", error);
  }
};


// ✅ API Endpoint to Trigger Function Manually
app.post("/api/store-videos", async (req, res) => {
  try {
    await storeVideosInDynamoDB();
    res.json({ message: "Videos successfully stored in DynamoDB" });
  } catch (error) {
    res.status(500).json({ error: "Failed to store videos", details: error.message });
  }
});

app.get("/api/list-videos", async (req, res) => {
  try {
    const scanCommand = new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_VID,
    });

    const { Items } = await dynamoClient.send(scanCommand);
    
    // ✅ Check if items exist before mapping
    if (!Items || Items.length === 0) {
      return res.json([]);
    }

    const videos = Items.map(item => ({
      videoName: item.VideoName?.S || "Unknown Name", // ✅ Use optional chaining
      videoUrl: item.VideoLink?.S || "#", // ✅ Default if missing
      uploadedAt: item.UploadedAt?.S || "N/A",
    }));

    res.json(videos);
  } catch (error) {
    console.error("❌ Error fetching videos:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

app.get('/', async (req, res) => {
  try {
    await redisClient.set('message', 'Hello from Redis!');
    const message = await redisClient.get('message');
    res.send(`Redis Message: ${message}`);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.post("/api/create-room", async (req, res) => {
  try {
    const { roomName, videoUrl } = req.body;

    // Validate Input
    if (!roomName || !videoUrl) {
      console.error("❌ Missing roomName or videoUrl");
      return res.status(400).json({ error: "Room name and video URL are required" });
    }

    console.log(`🔹 Creating room: ${roomName} with video: ${videoUrl}`);

    const putCommand = new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE_ROOM, // Your DynamoDB table for rooms
      Item: {
        Name: { S: roomName }, // Primary Key
        Video: { S: videoUrl },
        CreatedAt: { S: new Date().toISOString() },
      },
    });

    await dynamoClient.send(putCommand);

    console.log("✅ Room stored in DynamoDB!");
    res.json({ message: "Room created successfully!" });
  } catch (error) {
    console.error("❌ Error creating room:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});



app.post("/api/get-presigned-url", async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: "Missing filename or content type" });
    }

    console.log("Generating presigned URL for:", filename);

    const s3Params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `${filename}`,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(s3Params);
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    console.log("Presigned URL generated:", url);
    res.json({ url });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post('/upload', upload.single('video'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileName = req.file.key;
      const fileUrl = req.file.location;

      const params = {
          TableName: process.env.DYNAMODB_TABLE_VID,
          Item: {
              id: { S: Date.now().toString() },
              videoName: { S: fileName },
              videoUrl: { S: fileUrl }
          }
      };

      await dynamoDBClient.send(new PutItemCommand(params));

      res.json({ message: 'Video uploaded successfully', fileUrl });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Endpoint to scan the DynamoDB table for room/video info.
app.get('/scan', async (req, res) => {
  try {
    const command = new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_ROOM });
    const response = await dynamoClient.send(command);
    const items = response.Items.map(item => unmarshall(item));
    res.json({
      success: true,
      data: items,
      count: response.Count,
      scannedCount: response.ScannedCount,
    });
  } catch (error) {
    console.error('Error scanning DynamoDB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.IO connection handler.
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When a client joins a room
  socket.on('join-room', async (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
    
    // Fetch the current room state from Redis, or initialize a default state.
    let currentState = await getRoomState(room);
    if (!currentState) {
      currentState = { currentTime: 0, playing: false };
      await setRoomState(room, currentState);
    }
    // Send the current state to the joining client.
    socket.emit('sync-video', currentState);
  });

  // When a client emits a play event
  socket.on('video-play', async (data) => {
    console.log('Received video-play:', data);
    if (data.room) {
      const newState = { currentTime: data.currentTime, playing: true };
      await setRoomState(data.room, newState);
      socket.to(data.room).emit('video-play', data);
    }
  });

  // When a client emits a pause event
  socket.on('video-pause', async (data) => {
    console.log('Received video-pause:', data);
    if (data.room) {
      const newState = { currentTime: data.currentTime, playing: false };
      await setRoomState(data.room, newState);
      socket.to(data.room).emit('video-pause', data);
    }
  });

  // When a client emits a seek event
  socket.on('video-seek', async (data) => {
    console.log('Received video-seek:', data);
    if (data.room) {
      const prevState = (await getRoomState(data.room)) || { currentTime: 0, playing: false };
      const newState = { currentTime: data.currentTime, playing: prevState.playing };
      await setRoomState(data.room, newState);
      socket.to(data.room).emit('video-seek', data);
    }
  });

  // Optionally, you can clear stale state when no clients are left in a room.
  // For a distributed system, it may be easier to rely on TTL for cleanup.
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
