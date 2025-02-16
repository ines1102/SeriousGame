document.addEventListener('DOMContentLoaded', function() {
    const socket = io('https://seriousgame-ds65.onrender.com', {
        transports: ['websocket'], // ✅ Force WebSocket uniquement pour éviter les erreurs
        reconnection: true,
        reconnectionAttempts: 5, // ✅ Nombre de tentatives de reconnexion
        reconnectionDelay: 1000,
        timeout: 50000
    });

    const form = document.getElementById('registrationForm');
    const genderSelect = document.getElementById('gender');
    const avatarContainer = document.getElementById('avatarContainer');
    let selectedAvatar = null;

    // ✅ Gérer le changement de genre pour afficher les avatars correspondants
    genderSelect.addEventListener('change', updateAvatars);

    function updateAvatars() {
        const gender = genderSelect.value;
        avatarContainer.innerHTML = '';

        if (gender) {
            for (let i = 1; i <= 3; i++) {
                addAvatarOption(`${gender}${i}.jpeg`, `Avatar ${i}`);
            }
        }
    }

    // ✅ Fonction pour ajouter un avatar dans la liste
    function addAvatarOption(filename, alt) {
        const div = document.createElement('div');
        div.className = 'avatar-option fade-in';

        const img = document.createElement('img');
        img.src = `Avatars/${filename}`;
        img.alt = alt;

        div.appendChild(img);

        div.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(option => {
                option.classList.remove('selected');
            });

            div.classList.add('selected');
            selectedAvatar = filename;
        });

        avatarContainer.appendChild(div);
    }

    // ✅ Gestion de la soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const gender = genderSelect.value;

        if (!name || !gender || !selectedAvatar) {
            alert('Veuillez remplir tous les champs et sélectionner un avatar.');
            return;
        }

        // ✅ Stockage sécurisé des informations du joueur
        const playerData = { name, gender, avatar: selectedAvatar };
        localStorage.setItem('playerData', JSON.stringify(playerData));

        // ✅ Ajout d'une transition fluide
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = 'choose-mode.html';
        }, 500);
    });

    // ✅ Animation au chargement de la page
    document.body.style.opacity = '1';
});