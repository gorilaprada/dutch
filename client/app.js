const socket = io();

// DOM
const joinBtn = document.getElementById("joinBtn");
const nameInput = document.getElementById("name");
const playersList = document.getElementById("playersList");
const deck = document.getElementById("deck");
const discardPile = document.getElementById("discardPile");
const drawnCardHTML = document.getElementById("drawnCard");
const discardBtn = document.getElementById("discardBtn");
const stackBtn = document.getElementById("stackBtn");
const informationContainer = document.getElementById("information");

// For client side
const gridIds = ["hand-bottom", "hand-left", "hand-top", "hand-right"];
let pendingPower = null;
let jackSelection = null;
let wantToStack = false;
let informationMarkup;

// Helper function 
function reorderPlayers(players, myId) {
  const index = players.findIndex(player => player.id === myId);
  return [...players.slice(index), ...players.slice(0, index)];
}

function renderCard(card, cardIndex, targetGridId, playerId) {
  const content = card.isFaceUp ? `${card.id}` : "Facedown";
  const cardClass = card.isFaceUp ? "card-up" : "card-down";

  return `<div class="card ${cardClass} border-primary text-primary glow-text" id="${targetGridId}-${cardIndex}" onclick="handleCardClick('${playerId}', ${cardIndex})">${content}</div>`
};

function renderDrawnCardMarkup(card) {
  return `
    <span class="" id="" style="">${card.id}</span>
    <div class="absolute -right-1 -bottom-1 w-full h-full border-r border-b border-secondary/30 -z-10"></div>
  `
}

function renderInformation(strToDisplay) {
  return  `
    <span class="text-on-tertiary-container font-bold uppercase" style="">${strToDisplay}</span>
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

stackBtn.addEventListener("click", () => {
  if (wantToStack === false) {
    wantToStack = true;

    informationContainer.innerHTML = "";
    informationMarkup = renderInformation("Choose one card from your deck to STACK!");
    informationContainer.insertAdjacentHTML("beforeend", informationMarkup); 
  } else {
    wantToStack = false;

    informationContainer.innerHTML = "";
  }
});

discardBtn.addEventListener("click", () => {
  drawnCardHTML.innerHTML = "EMPTY";
  socket.emit("discardCard");
});

// Handles the follwing emits: queenPower, jackPower and switchCards
function handleCardClick(playerId, handIndex) {
  // Emit queenPower
  if (pendingPower === "queen") {
    socket.emit("queenPower", { targetPlayerId: playerId, handIndex: handIndex});
    pendingPower = null;
    return;
  // Emit jackPower
  } else if (pendingPower === "jack") {
    if (!jackSelection) {
      jackSelection = { player1Id: playerId, index1: handIndex};
      informationContainer.innerHTML = "";
      informationMarkup = renderInformation("Choose another card to swap it with!");
      informationContainer.insertAdjacentHTML("beforeend", informationMarkup); 
      return;
    } else {
      socket.emit("jackPower", {
        player1Id: jackSelection.player1Id,
        index1: jackSelection.index1,
        player2Id: playerId,
        index2: handIndex
      });
      pendingPower = null;
      jackSelection = null;
      return;
    }
  // Emit stack
  } else if (wantToStack === true) {
    socket.emit("stack", handIndex);
    wantToStack = false;
    informationContainer.innerHTML = "";
    return;
  }

  // Default click
  drawnCardHTML.innerHTML = "EMPTY";
  socket.emit("switchCards", handIndex);
  return;
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
          .map((card, index) => renderCard(card, index, gridIds[i], player.id))
          .join("");
      }
    })

    if (data.discardTop) {
      discardPile.innerHTML = `${data.discardTop.id}`;
    }

    if (data.phase === "drawing" || data.phase === "deciding") {
      informationContainer.innerHTML = "";
      pendingPower = null;
      jackSelection = null;
    } else if (data.phase === "power_queen" && data.pendingPowerOwner === socket.id) {
      pendingPower = "queen";
      informationContainer.innerHTML = "";
      informationMarkup = renderInformation("Choose any card to see it!");
      informationContainer.insertAdjacentHTML("beforeend", informationMarkup); 
    } else if (data.phase === "power_jack" && data.pendingPowerOwner === socket.id) {
      pendingPower = "jack";
      jackSelection = null;
      informationContainer.innerHTML = "";
      informationMarkup = renderInformation("Choose any two cards to swap them!");
      informationContainer.insertAdjacentHTML("beforeend", informationMarkup); 
    }

  } else {
    alert("error: Game not updated");
  }
  return;
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


