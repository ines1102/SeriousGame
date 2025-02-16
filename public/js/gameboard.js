document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    // 📌 Vérification des données utilisateur
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

    // ✅ Connexion au serveur
    const socket = io();

    // 🔍 **Écoute TOUS les événements pour debugging**
    socket.onAny((event, data) => {
        console.log(`📩 Événement reçu : ${event}`, data);
    });

    // 📌 Envoi de la demande de connexion
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    console.log("👂 En attente de l'événement `game_start`...");

    // ⏳ Vérification après 5 secondes
    setTimeout(() => {
        console.warn("⏳ Vérification : aucun `game_start` reçu après 5 secondes ?");
    }, 5000);

    // ✅ Écoute `game_start`
    socket.on("game_start", ({ player1, player2 }) => {
        console.log("✅ Événement `game_start` reçu !");

        // 📌 Afficher les joueurs dans la console
        console.log("📌 Profils des joueurs reçus :");
        console.log("👤 Joueur 1 :", player1);
        console.log("👤 Joueur 2 :", player2);

        // 🎭 **Mise à jour de l'interface**
        if (player1.name === userName) {
            updateProfile(player1, player2);
        } else {
            updateProfile(player2, player1);
        }
    });

    // ✅ Écoute `test_connection`
    socket.on("test_connection", (data) => {
        console.log("📌 Test reçu depuis le serveur :", data);
    });

    // 📌 **Mise à jour des profils**
    function updateProfile(player, opponent) {
        document.querySelector("#player-name").textContent = player.name;
        document.querySelector("#player-avatar").src = player.avatar;

        document.querySelector("#opponent-name").textContent = opponent.name;
        document.querySelector("#opponent-avatar").src = opponent.avatar;

        console.log("✅ Profils mis à jour !");
    }
});