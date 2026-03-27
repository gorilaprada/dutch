const socket = io();

const joinBtn = document.getElementById('joinBtn');
const nameInput = document.getElementById('name');

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();

  if (name) {
    socket.emit('joinGame', { name: name });

    joinBtn.disabled = true;
    console.log(`Sent joinGame request for: ${name}`);
  } else {
    alert("Please enter a name");
  }
});

socket.on('playerJoined', (message) => {
  console.log(message);
})

socket.on('error', (message) => {
  alert(message);
  joinBtn.disabled = true;
});
