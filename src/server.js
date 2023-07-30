import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();
// 각 방에 대한 사용자 목록을 저장하는 객체
const rooms = {};

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
  // 사용자가 방에 입장하는 이벤트
  socket.on("join_room", (roomName) => {
    // 해당 방에 이미 2명의 사용자가 있는 경우 입장을 거부하고 연결을 종료
    if (rooms[roomName] && rooms[roomName].length === 2) {
      socket.emit("room_full");
      socket.disconnect();
    } else {
      // 사용자를 방에 추가
      if (rooms[roomName]) {
        rooms[roomName].push(socket.id);
      } else {
        rooms[roomName] = [socket.id];
      }
      socket.join(roomName);
      socket.to(roomName).emit("welcome");
      // 사용자가 연결을 끊는 경우, 사용자를 방에서 제거
      socket.on("disconnect", () => {
        rooms[roomName] = rooms[roomName].filter((user) => user !== socket.id);
      });
    }
  });

  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
