// index.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const genderSelect = document.getElementById('gender');
    const avatarContainer = document.getElementById('avatarContainer');
    let selectedAvatar = null;

    // Gérer le changement de genre
    genderSelect.addEventListener('change', updateAvatars);

    // Mettre à jour les avatars disponibles
    function updateAvatars() {
        const gender = genderSelect.value;
        avatarContainer.innerHTML = '';
        
        if (gender) {
            for (let i = 1; i <= 3; i++) {
                addAvatarOption(`${gender}${i}.jpeg`, `Avatar ${i}`);
            }
        }
    }

    // Ajouter une option d'avatar
    function addAvatarOption(filename, alt) {
        const div = document.createElement('div');
        div.className = 'avatar-option fade-in';
        
        const img = document.createElement('img');
        img.src = `Avatars/${filename}`;
        img.alt = alt;
        
        div.appendChild(img);
        
        div.addEventListener('click', () => {
            // Retirer la sélection précédente
            document.querySelectorAll('.avatar-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            // Ajouter la nouvelle sélection
            div.classList.add('selected');
            selectedAvatar = filename;
        });
        
        avatarContainer.appendChild(div);
    }

    // Gérer la soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const gender = genderSelect.value;
        
        // Validation
        if (!name || !gender || !selectedAvatar) {
            alert('Veuillez remplir tous les champs et sélectionner un avatar.');
            return;
        }
        
        // Sauvegarder les données
        const playerData = {
            name,
            gender,
            avatar: selectedAvatar
        };
        
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        // Animation de transition
        document.body.style.opacity = '0';
        
        // Redirection
        setTimeout(() => {
            window.location.href = 'choose-mode.html';
        }, 500);
    });

    // Animation au chargement de la page
    document.body.style.opacity = '1';
});