document.addEventListener("DOMContentLoaded", () => {
    const userNameElement = document.getElementById("user-name");
    const userAvatarElement = document.getElementById("user-avatar");
    const createRoomButton = document.getElementById("create-room");
    const joinRoomButton = document.getElementById("join-room");
    const roomCodeInput = document.getElementById("room-code");
    const loadingOverlay = document.getElementById("loading-overlay");
    const cancelWaitButton = document.getElementById("cancel-wait");
    const roomCodeDisplay = document.getElementById("room-code-display");
    const displayCode = document.getElementById("display-code");
    const copyCodeButton = document.getElementById("copy-code");

    const socket = io(); // Connexion au serveur Socket.io

    // Récupération des informations utilisateur
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    sessionStorage.setItem("roomId", roomId);
    
    if (userName) userNameElement.textContent = userName;
    if (userAvatar) userAvatarElement.src = userAvatar;
    else userAvatarElement.src = "/Avatars/default.jpeg"; // Avatar par défaut

    /** Fonction pour générer un code de room à 4 chiffres */
    function generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    /** Création d'une room */
    createRoomButton.addEventListener("click", () => {
        const roomId = generateRoomCode();
        sessionStorage.setItem("roomId", roomId);

        // Affiche l'overlay de chargement
        loadingOverlay.classList.remove("hidden");
        roomCodeDisplay.classList.remove("hidden");
        displayCode.textContent = roomId;

        socket.emit("create_room", { roomId, name: userName, avatar: userAvatar });

        socket.on("room_ready", () => {
            window.location.href = "/gameboard.html"; // Rediriger vers le plateau de jeu
        });
    });

    /** Rejoindre une room existante */
    joinRoomButton.addEventListener("click", () => {
        const roomId = roomCodeInput.value.trim();

        if (roomId.length !== 4 || isNaN(roomId)) {
            alert("Veuillez entrer un code de room valide (4 chiffres).");
            return;
        }

        sessionStorage.setItem("roomId", roomId);
        loadingOverlay.classList.remove("hidden");

        socket.emit("join_room", { roomId, name: userName, avatar: userAvatar });

        socket.on("room_joined", () => {
            window.location.href = "/gameboard.html";
        });

        socket.on("room_not_found", () => {
            alert("La room n'existe pas ou est pleine.");
            loadingOverlay.classList.add("hidden");
        });
    });

    /** Copier le code de la room */
    copyCodeButton.addEventListener("click", () => {
        navigator.clipboard.writeText(displayCode.textContent).then(() => {
            alert("Code copié dans le presse-papiers !");
        });
    });

    /** Annuler la recherche d'un adversaire */
    cancelWaitButton.addEventListener("click", () => {
        socket.emit("leave_room");
        loadingOverlay.classList.add("hidden");
    });
});