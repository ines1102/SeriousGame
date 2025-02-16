document.addEventListener("DOMContentLoaded", () => {
    console.log("📌 Initialisation de `choose-mode.js`");

    // Récupération des infos utilisateur
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");

    console.log("📌 Utilisateur :", userName, "Avatar :", userAvatar);

    if (!userName || !userAvatar) {
        console.error("❌ Données utilisateur manquantes !");
        alert("Erreur : Veuillez sélectionner un avatar et un pseudo.");
        window.location.href = "/";
        return;
    }

    // Mise à jour de l'affichage
    const userNameElement = document.getElementById("user-name");
    const userAvatarElement = document.getElementById("user-avatar");

    if (userNameElement && userAvatarElement) {
        userNameElement.textContent = userName;
        userAvatarElement.src = userAvatar;
    } else {
        console.error("❌ Éléments utilisateur introuvables.");
    }

    // Connexion Socket.IO
    const socket = io();

    // Vérification des boutons (correction des ID)
    const randomGameBtn = document.getElementById("random-mode");
    const friendGameBtn = document.getElementById("friend-mode");

    if (randomGameBtn) {
        randomGameBtn.addEventListener("click", () => {
            console.log("🔄 Recherche d'une room aléatoire...");
            socket.emit("find_random_room", { name: userName, avatar: userAvatar });
            
            // Affichage de l'overlay de recherche
            document.getElementById("loading-overlay").classList.remove("hidden");
        });
    } else {
        console.error("❌ Bouton 'Joueur aléatoire' introuvable.");
    }

    if (friendGameBtn) {
        friendGameBtn.addEventListener("click", () => {
            const roomId = prompt("Entrez le code de la room (4 chiffres) :");
            if (roomId && /^\d{4}$/.test(roomId)) {
                console.log(`🔄 Tentative de rejoindre Room ${roomId}...`);
                socket.emit("join_private_game", { roomId, name: userName, avatar: userAvatar });
            } else {
                alert("❌ Code de room invalide. Entrez 4 chiffres.");
            }
        });
    } else {
        console.error("❌ Bouton 'Jouer entre amis' introuvable.");
    }

    // ✅ Room trouvée pour un match aléatoire
    socket.on("game_found", ({ roomId }) => {
        console.log(`✅ Room trouvée : ${roomId}`);
        sessionStorage.setItem("roomId", roomId);
        window.location.href = "/gameboard";
    });

    // ✅ Rejoindre une room privée
    socket.on("room_joined", ({ roomId }) => {
        console.log(`✅ Rejoint Room ${roomId}`);
        sessionStorage.setItem("roomId", roomId);
        window.location.href = "/gameboard";
    });

    // 🛑 Erreur lors de la recherche de room
    socket.on("error_message", (msg) => {
        console.error(`❌ Erreur : ${msg}`);
        document.getElementById("error-message").textContent = msg;
        document.getElementById("error-toast").classList.add("show");

        setTimeout(() => {
            document.getElementById("error-toast").classList.remove("show");
        }, 3000);
    });

    // ✅ Annuler la recherche
    const cancelSearchBtn = document.getElementById("cancel-search");
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener("click", () => {
            console.log("🔄 Annulation de la recherche...");
            socket.emit("cancel_search");
            document.getElementById("loading-overlay").classList.add("hidden");
        });
    }
});