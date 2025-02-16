document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur incomplètes, retour à l'accueil.");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    const socket = io();

    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    document.getElementById("player-name").textContent = userName;
    document.getElementById("player-avatar").src = userAvatar;

    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        let opponent = gameData.player1.name === userName ? gameData.player2 : gameData.player1;

        document.getElementById("opponent-name").textContent = opponent.name;
        document.getElementById("opponent-avatar").src = opponent.avatar;

        console.log(`🎭 Profil adversaire mis à jour : ${opponent.name}, ${opponent.avatar}`);
    });

    socket.on("update_turn", (currentTurn) => {
        const turnIndicator = document.getElementById("turn-indicator");
        turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    socket.on("game_over", ({ winner }) => {
        alert(`🏆 Partie terminée ! Gagnant : ${winner}`);
        window.location.href = "/";
    });

    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie.");
    });

    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        document.getElementById("opponent-name").textContent = data.name;
        document.getElementById("opponent-avatar").src = data.avatar;
    });
});