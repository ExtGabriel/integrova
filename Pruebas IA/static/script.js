function sendMessage() {
    const message = document.getElementById('message').value;
    if (!message) return;

    // Agregar mensaje del usuario al chat
    const chat = document.getElementById('chat');
    chat.innerHTML += `<p><strong>Tú:</strong> ${message}</p>`;
    document.getElementById('message').value = '';

    // Enviar a la API
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.response) {
            chat.innerHTML += `<p><strong>IA:</strong> ${data.response}</p>`;
        } else {
            chat.innerHTML += `<p><strong>Error:</strong> ${data.error}</p>`;
        }
        chat.scrollTop = chat.scrollHeight;
    })
    .catch(error => {
        console.error('Error:', error);
        chat.innerHTML += `<p><strong>Error:</strong> No se pudo conectar con la IA.</p>`;
    });
}

// Permitir enviar con Enter
document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
