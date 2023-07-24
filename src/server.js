import http from "http";
import WebSocket from "ws";
import express from "express";


const app = express();


app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req,res) => res.render("home"));
app.get("/*", (req,res) => res.redirect("/"));


const handleListen = () => console.log(`Listening on http://localhost:3000`);


// make it also listening on ws://localhost:3000
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); 


const socks = [];

wss.on("connection", (socket) => {

    socks.push(socket);

    socket["nikname"] = "Anonymous";

    console.log("Connected to Server ✅");

    socket.on("close", () => {
        console.log("Disconnected from Server ❎")
    });

    socket.on("message", (msg) => {
        const message = JSON.parse(msg);

        switch (message.type) {

            // abbreviation for socket => sock

            case "new_msg":
                socks.forEach((sock) => 
                    sock.send(`${socket.nikname}: ${message.payload}`)
                );

            case "nikname":
                socket["nikname"] = message.payload;

        }

    });
});


server.listen(3000, handleListen);