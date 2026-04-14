const socket = io();

const joinBtn = document.getElementById("joinBtn");
const nameInput = document.getElementById("name");
const playersList = document.getElementById("playersList")
const deck = document.getElementById("deck");
const discardPile = document.getElementById("discardPile")

const gridIds = ["hand-bottom", "hand-left", "hand-top", "hand-right"];

// Helper function 
function reorderPlayers(players, myId) {
  const index = players.findIndex(player => player.id === myId);
  return [...players.slice(index), ...players.slice(0, index)];
}

function renderCard(card, cardIndex, targetGridId) {
  const content = card.isFaceUp ? `${card.id}` : "Facedown";
  const cardClass = card.isFaceUp ? "card face-up" : "card face-down";

  return `<div class="${cardClass}" id="${targetGridId}-${cardIndex}">${content}</div>`
};

// Lobby
joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();

  if (name) {
    socket.emit("joinGame", { name: name });

    joinBtn.disabled = true;
    console.log(`Sent joinGame request for: ${name}`);
  } else {
    alert("Please enter a name");
  }
});

// Game
// Starting
startBtn.addEventListener("click", () => {
  socket.emit("startGame")
})

socket.on("gameUpdated", (response) => {
  if (response.success) {
    const data = response.data;
    const orderedPlayers = reorderPlayers(data.players, socket.id);

    orderedPlayers.forEach((player, i) => {
      const grid = document.getElementById(gridIds[i]);
      if (grid) {
        grid.innerHTML = player.hand
          .map((card, index) => renderCard(card, index, gridIds[i]))
          .join("");
      }
    })

    const discard = document.getElementById("discardPile");
    if (data.discardTop) {
      discard.innerHTML = `${data.discardTop.id}`
    }
  } else {
    alert("error: Game not updated");
  }
});


// Drawing




// Events automatically handled
socket.on("updatePlayersList", (players) => {
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

socket.on("error", (message) => {
  alert(message);
  joinBtn.disabled = true;
});


