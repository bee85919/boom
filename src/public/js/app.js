// 소켓 서버에 연결
const socket = io();

// HTML 요소를 선택
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

// 카메라 장치를 가져오는 함수
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

// 미디어를 가져오는 함수
async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

// 음소거 버튼 클릭 이벤트 핸들러
function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}

// 카메라 버튼 클릭 이벤트 핸들러
function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

// 카메라 변경 이벤트 핸들러
async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

// 이벤트 리스너 등록
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// 방에 입장하는 폼
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

// 비디오 통화를 초기화하는 함수
async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

// 방에 입장하는 폼 제출 이벤트 핸들러
async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// 소켓 이벤트 핸들러

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => displayMessage(event.data));
  console.log("made data channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => displayMessage(event.data));
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// 방이 가득 찼을 때의 이벤트
socket.on("room_full", () => {
  alert("방이 가득 찼습니다. 입장할 수 없습니다.");
});

// Chat

const chatBox = document.querySelector("#chatBox");
const chatForm = document.querySelector("#chatForm");

// 채팅 폼 제출 이벤트
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = chatForm.querySelector("input");
  // 입력한 메시지를 DataChannel을 통해 전송하고 화면에 표시
  myDataChannel.send(input.value);
  displayMessage(`You: ${input.value}`);
  input.value = "";
});

// 메시지를 화면에 표시하는 함수
function displayMessage(message) {
  const item = document.createElement("li");
  item.innerText = message;
  chatBox.appendChild(item);
}

// RTC Code

// WebRTC 연결을 생성하는 함수
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

// 트랙이 추가되었을 때의 이벤트 핸들러
myPeerConnection.addEventListener("track", handleTrack)

// 트랙이 추가되었을 때 실행되는 함수
function handleTrack(data) {
  console.log("handle track")
  // 상대방의 비디오를 화면에 출력
  const peerFace = document.querySelector("#peerFace")
  peerFace.srcObject = data.streams[0]
}

// ICE 후보를 전송하는 이벤트 핸들러
function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

// 스트림이 추가되었을 때의 이벤트 핸들러
function handleAddStream(data) {
  // 상대방의 비디오를 화면에 출력
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}