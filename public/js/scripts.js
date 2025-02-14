const socket = io('http://localhost:3000');

let userProfile = {};

// ** Gestion des avatars selon le sexe **
document.addEventListener('DOMContentLoaded', () => {
  const sexInput = document.getElementById('sex');
  const avatarContainer = document.getElementById('avatar-container');

  if (sexInput) {
    sexInput.addEventListener('change', () => {
      avatarContainer.innerHTML = '';
      const avatars = sexInput.value === 'male' 
        ? ['male1.jpeg', 'male2.jpeg','male3.jpeg'] 
        : ['female1.jpeg', 'female2.jpeg','female3.jpeg'];

      avatars.forEach((avatar) => {
        const img = document.createElement('img');
        img.src = `avatars/${avatar}`;
        img.alt = avatar;
        img.addEventListener('click', () => selectAvatar(img, avatar));
        avatarContainer.appendChild(img);
      });

      document.getElementById('avatar-selection').classList.remove('hidden');
    });
  }

  function selectAvatar(img, avatar) {
    document.querySelectorAll('#avatar-container img').forEach(img => img.classList.remove('selected'));
    img.classList.add('selected');
    userProfile.avatar = avatar;
  }

  // ** Enregistrement du profil **
  const form = document.getElementById('user-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      userProfile.name = document.getElementById('name').value;
      userProfile.sex = sexInput.value;

      window.location.href = 'mode.html';
    });
  }

  // ** Création ou rejoindre une room **
  const createRoomButton = document.getElementById('create-room');
  const joinRoomButton = document.getElementById('join-room');
  const roomInfo = document.getElementById('room-info');
  const roomIdInput = document.getElementById('room-id');
  const roomNumber = document.getElementById('room-number');

  if (createRoomButton) {
    createRoomButton.addEventListener('click', () => {
      socket.emit('createRoom', userProfile);
    });
  }

  if (joinRoomButton) {
    joinRoomButton.addEventListener('click', () => {
      const roomId = roomIdInput.value;
      socket.emit('joinRoom', { ...userProfile, roomId });
    });
  }

  socket.on('roomCreated', (roomId) => {
    roomInfo.classList.remove('hidden');
    roomNumber.textContent = `Numéro de room : ${roomId}`;
  });

  socket.on('roomJoined', () => {
    window.location.href = 'game.html';
  });
});