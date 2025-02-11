const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { DynamoDBClient, ListTablesCommand, QueryCommand, GetItemCommand, ScanCommand} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { Server } = require("socket.io");
app.use(cors());

const server = http.createServer(app);

const client = new DynamoDBClient({
    region: "us-east-1",
    credentials: {
        accessKeyId: 'AKIAWQUOZ5LZDSIXSC6R',
        secretAccessKey: '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'
    }
})

function scanDb() {
    const scanCommand = new ScanCommand({
        "TableName" : "Rooms",
    });
    const res = client.send(scanCommand);
    console.log(res.Items)
    return res.Items

}

app.get("/api", (req, res) => {
    return res.json({message : "This is from backend"});
})

app.get("/scan", async (req, res) => {
    const params =  {
        TableName: "Rooms",
    }
    try {
        const command = new ScanCommand(params);
        const response = await client.send(command);
        const items = response.Items.map(item => unmarshall(item));
        console.log(items);
        res.json({
            success: true,
            data: items,
            count: response.Count,
            scannedCount: response.ScannedCount,
        })

    } catch (error) {
        console.error("Error scanning table:", error);
        res.status(500).json({success: false, error: error.message});
    }
})


const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

io.on("connection", (socket) => {
    console.log(socket.id);

    socket.on("join_room", (data) => {
        socket.join(data);
        console.log(`User with ID: ${socket.id} joined room: ${data}`);
      });

    socket.on("disconnect", () => {
        console.log("USER DISCONNECT" , socket.id);
    })

    socket.on("pause", (data) => {
        io.to(data.room)("receivePause");
        console.log("PAUSE VIDEO for " , data.room);
    })
})


server.listen(3001, () => {
    console.log("SERVER RUNNING");
});