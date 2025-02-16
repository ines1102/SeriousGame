// index.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const genderSelect = document.getElementById('gender');
    const avatarContainer = document.getElementById('avatarContainer');
    const selectedAvatarInput = document.getElementById('selectedAvatar');
    
    // Gestionnaire de changement de genre
    genderSelect.addEventListener('change', updateAvatars);
    
    // Mise à jour des avatars disponibles
    function updateAvatars() {
        const gender = genderSelect.value;
        avatarContainer.innerHTML = '';
        
        // Ajouter l'avatar par défaut
        addAvatarOption('default.jpeg', 'Avatar par défaut');
        
        // Ajouter les avatars spécifiques au genre
        if (gender) {
            for (let i = 1; i <= 3; i++) {
                addAvatarOption(`${gender}${i}.jpeg`, `Avatar ${gender} ${i}`);
            }
        }
    }
    
    // Ajouter une option d'avatar
    function addAvatarOption(filename, alt) {
        const div = document.createElement('div');
        div.className = 'avatar-option fade-in';
        
        const img = document.createElement('img');
        img.src = `/Avatars/${filename}`;
        img.alt = alt;
        img.loading = 'lazy';
        
        div.appendChild(img);
        
        div.addEventListener('click', () => {
            // Supprimer la sélection précédente
            document.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Ajouter la nouvelle sélection
            div.classList.add('selected');
            selectedAvatarInput.value = filename;
            
            // Animation de sélection
            div.style.animation = 'none';
            div.offsetHeight; // Forcer le reflow
            div.style.animation = 'selectPulse 0.5s ease';
        });
        
        avatarContainer.appendChild(div);
    }
    
    // Gestionnaire de soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const gender = genderSelect.value;
        const avatar = selectedAvatarInput.value;
        
        // Validation
        if (!name || !gender || !avatar) {
            alert('Veuillez remplir tous les champs et sélectionner un avatar.');
            return;
        }
        
        // Sauvegarder les données du joueur
        const playerData = {
            name,
            gender,
            avatar
        };
        
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        // Animation de transition
        document.body.style.opacity = '0';
        setTimeout(() => {
            // Redirection vers la page de choix du mode
            window.location.href = '/choose-mode.html';
        }, 500);
    });
    
    // Animation au chargement de la page
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.5s ease';
    }, 100);
    
    // Charger les avatars initiaux
    updateAvatars();
});