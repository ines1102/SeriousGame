document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur incomplètes.");
        window.location.href = "/";
        return;
    }

    // Connexion socket
    const socket = io();

    // 📌 Émettre un événement pour rejoindre la room
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // ✅ Mettre à jour le profil du joueur
    document.getElementById("player-name").textContent = userName;
    document.getElementById("player-avatar").src = userAvatar;

    // 📌 Mise à jour des profils des joueurs (adversaire)
    socket.on("update_profiles", (players) => {
        console.log("📌 Mise à jour des profils des joueurs :", players);

        const opponent = Object.values(players).find(p => p.id !== socket.id);

        if (opponent) {
            document.getElementById("opponent-name").textContent = opponent.name;
            document.getElementById("opponent-avatar").src = opponent.avatar;

            console.log("🎭 Profil adversaire mis à jour :", opponent);
        } else {
            console.warn("⚠️ Aucun adversaire trouvé !");
        }
    });

    // ✅ Gestion des déconnexions
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        document.getElementById("opponent-name").textContent = "Déconnecté";
        document.getElementById("opponent-avatar").src = "/Avatars/default.jpeg";
    });

    // ✅ Gestion de la reconnexion de l'adversaire
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        document.getElementById("opponent-name").textContent = data.name;
        document.getElementById("opponent-avatar").src = data.avatar;
    });
});