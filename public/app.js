const socket = io();

const joinBtn = document.getElementById("joinBtn");
const nameInput = document.getElementById("name");
const playersList = document.getElementById("playersList");
const deck = document.getElementById("deck");
const discardPile = document.getElementById("discardPile");
const drawnCardHTML = document.getElementById("drawnCard");
const discardBtn = document.getElementById("discardBtn");
const switchBtn = document.getElementById("switchBtn");

const gridIds = ["hand-bottom", "hand-left", "hand-top", "hand-right"];

// Helper function 
function reorderPlayers(players, myId) {
  const index = players.findIndex(player => player.id === myId);
  return [...players.slice(index), ...players.slice(0, index)];
}

function renderCard(card, cardIndex, targetGridId) {
  const content = card.isFaceUp ? `${card.id}` : "Facedown";
  const cardClass = card.isFaceUp ? "card face-up" : "card face-down";

  return `<div class="card ${cardClass} border-primary text-primary glow-text" id="${targetGridId}-${cardIndex}" onclick="handleCardClick(${cardIndex})">${content}</div>`
};

function renderDrawnCardMarkup(card) {
  return `
    <span class="" id="" style="">${card.id}</span>
    <div class="absolute -right-1 -bottom-1 w-full h-full border-r border-b border-secondary/30 -z-10"></div>
  `
}

// Emitters
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

startBtn.addEventListener("click", () => {
  socket.emit("startGame")
})

deck.addEventListener("click", () => {
  socket.emit("drawCard", { drawFrom: "deck" });
});

discardPile.addEventListener("click", () => {
  socket.emit("drawCard", { drawFrom: "discardPile" });
});

discardBtn.addEventListener("click", () => {
  drawnCardHTML.innerHTML = "EMPTY";
  socket.emit("discardCard");
});

function handleCardClick(handIndex) {
  drawnCardHTML.innerHTML = "EMPTY";
  socket.emit("switchCards", handIndex);
};

// Rendering logic
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

    if (data.discardTop) {
      discardPile.innerHTML = `${data.discardTop.id}`
    }
  } else {
    alert("error: Game not updated");
  }
});

socket.on("updatePlayersList", (players) => {
  playersList.innerHTML = ""

  players.forEach(player => {
    const playerName = player.name;
    const playerId = player.id;

    const playerMarkup = `
      <li class="flex items-center gap-3 p-3 bg-surface-container/50 border-l-4 border-secondary" style="">
        <span class="material-symbols-outlined text-sm text-secondary" style="">radio_button_checked</span>
        <span class="text-xs font-bold uppercase tracking-wider" style="">${playerName}</span>
        <span class="ml-auto text-[8px] bg-secondary/20 text-secondary px-1 font-black" style="">${playerId}</span>
      </li>
      `
    playersList.insertAdjacentHTML("beforeend", playerMarkup);
  })

  const isHost = players.length >= 2 && players[0].id === socket.id
  document.getElementById("startBtn").style.display = isHost ? "block" : "none";
})

socket.on("renderDrawnCard", (result) => {
  drawnCardHTML.innerHTML = "";

  card = result.data.card;
  discardTop = result.data.discardTop;

  const markup = renderDrawnCardMarkup(card);

  drawnCardHTML.insertAdjacentHTML("beforeend", markup);

  // Render discard top card if player drew for discard
  if (discardTop) {
    discardPile.innerHTML = `${discardTop.id}`
  } else {
    discardPile.innerHTML = `EMPTY`
  }
})

socket.on("error", (message) => {
  alert(message);
  joinBtn.disabled = true;
});


