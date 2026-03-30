const socket = io();

const joinBtn = document.getElementById('joinBtn');
const nameInput = document.getElementById('name');
const playersList = document.getElementById('playersList')

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

socket.on('updatePlayersList', (players) => {

  playersList.innerHTML = ""

  players.forEach(player => {
    const li = document.createElement("li")

    li.textContent = player.name

    playersList.appendChild(li);
  })

  if (players.length >= 2 && players[0].id === socket.id) {
    document.getElementById("startBtn").style.display = "block";
  }

})

socket.on('error', (message) => {
  alert(message);
  joinBtn.disabled = true;
});
