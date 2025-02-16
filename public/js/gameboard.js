document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    const roomId = sessionStorage.getItem("roomId");
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!roomId || !userName || !userAvatar) {
        console.error("❌ Données utilisateur manquantes, retour à l'accueil.");
        alert("Erreur : Données utilisateur incomplètes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    const socket = io();
    socket.emit("join_room", { roomId, name: userName, avatar: userAvatar });

    console.log("👂 En attente de l'événement `game_start`...");

    socket.on("game_start", ({ player1, player2 }) => {
        console.log("🎮 `game_start` reçu !");
        console.log("📌 Profils des joueurs reçus :", player1, player2);

        const opponent = player1.name === userName ? player2 : player1;

        document.getElementById("player-name").textContent = userName;
        document.getElementById("player-avatar").src = userAvatar;
        document.getElementById("opponent-name").textContent = opponent.name;
        document.getElementById("opponent-avatar").src = opponent.avatar;

        console.log(`👤 Joueur : ${userName} - Avatar : ${userAvatar}`);
        console.log(`👤 Adversaire : ${opponent.name} - Avatar : ${opponent.avatar}`);
    });

    setTimeout(() => {
        console.log("⏳ Vérification : aucun `game_start` reçu après 5 secondes ?");
        socket.emit("check_game_start", { roomId });
    }, 5000);
});