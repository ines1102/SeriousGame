document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    // 📌 Récupération des données utilisateur
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

    // ✅ Connexion à Socket.io
    const socket = io();

    // ✅ Rejoindre la room
    socket.emit("join_room", { roomId, name: userName, avatar: userAvatar });

    console.log("👂 En attente de l'événement `game_start`...");

    // ✅ Écoute de `game_start`
    socket.on("game_start", ({ player1, player2 }) => {
        console.log("🎮 `game_start` reçu !");

        // 📌 Vérification des joueurs
        console.log("📌 Profils des joueurs reçus :", player1, player2);

        // Mise à jour de l'affichage des joueurs
        if (player1.name === userName) {
            document.getElementById("player-name").textContent = player1.name;
            document.getElementById("player-avatar").src = player1.avatar;
            document.getElementById("opponent-name").textContent = player2.name;
            document.getElementById("opponent-avatar").src = player2.avatar;
        } else {
            document.getElementById("player-name").textContent = player2.name;
            document.getElementById("player-avatar").src = player2.avatar;
            document.getElementById("opponent-name").textContent = player1.name;
            document.getElementById("opponent-avatar").src = player1.avatar;
        }

        console.log(`👤 Joueur : ${userName} - Avatar : ${userAvatar}`);
        console.log(`👤 Adversaire : ${player1.name === userName ? player2.name : player1.name}`);
    });

    // ✅ Vérification après 5 secondes si `game_start` ne s'est pas déclenché
    setTimeout(() => {
        console.log("⏳ Vérification : aucun `game_start` reçu après 5 secondes ?");
        socket.emit("check_game_start", { roomId });
    }, 5000);
});