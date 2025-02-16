// 📌 Vérifier si la room a 2 joueurs et démarrer la partie
function startGameIfReady(roomId) {
    const players = Object.values(rooms[roomId].players);
    if (players.length === 2) {
        console.log(`🎮 Début du jeu Room ${roomId} : ${players[0].name} vs ${players[1].name}`);

        // S'assurer que les joueurs sont bien dans la room
        console.log(`📌 Vérification : joueurs dans la Room ${roomId}`, io.sockets.adapter.rooms.get(roomId));

        io.to(roomId).emit("game_start", {
            player1: players[0],
            player2: players[1]
        });

        console.log("📌 Profils des joueurs envoyés aux clients :", players);
    } else {
        console.warn(`⚠️ Pas assez de joueurs dans la Room ${roomId}, en attente...`);
    }
}