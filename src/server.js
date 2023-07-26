// 필요한 모듈 가져오기
import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

// Pug 템플릿 엔진 설정
app.set("view engine", "pug");
app.set("views", __dirname + "/views");

// 'public' 디렉토리에서 정적 파일 제공
app.use("/public", express.static(__dirname + "/public"));

// 라우트 정의
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

// HTTP 서버와 Socket.IO 서버 인스턴스 생성
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

// 공개 방 목록 반환하는 헬퍼 함수
function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms }
    }
  } = wsServer;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

// 방 인원 수를 반환하는 헬퍼 함수
function countRoom(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

// 웹소켓 이벤트 처리
wsServer.on("connection", (socket) => {
  wsServer.sockets.emit("openRoom", publicRooms());
  socket["nickname"] = "guest";

  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });

  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName);
    done();
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
    );
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });

  socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
});

// 서버 시작 및 지정한 포트에서 대기
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () =>
  console.log(`http://localhost:${PORT} 에서 대기 중`)
);