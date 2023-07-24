const msgList = document.querySelector("ul");
const nikForm = document.querySelector("#nik");
const msgForm = document.querySelector("#msg");
const socket = new WebSocket(`ws://${window.location.host}`); // window.location.host = localhost:3000

function makeMsg(type, payload) {
    const msg = { type, payload };
    return JSON.stringify(msg);
}

socket.addEventListener("open", () => {
    console.log("Connected to Server ✅");
});    
  
socket.addEventListener("close", () => {
    console.log("Disconnected from Server ❌");
});  
  
socket.addEventListener("message", (message) => {
    const li = document.createElement("li");
    li.innerText = message.data;
    msgList.append(li);
});

function handleMsgSubmit(event) {
    event.preventDefault();
    const input = msgForm.querySelector("input");
    socket.send(makeMsg("new_msg", input.value));
    input.value = "";
}

function handleNikSubmit(event) {
    event.preventDefault();
    const input = nikForm.querySelector("input");
    socket.send(makeMsg("nikname", input.value));
    input.value = "";
};

msgForm.addEventListener("submit", handleMsgSubmit);
nikForm.addEventListener("submit", handleNikSubmit);
