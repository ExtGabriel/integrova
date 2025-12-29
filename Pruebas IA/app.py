from flask import Flask, request, jsonify, render_template
from groq import Groq
import os

app = Flask(__name__)

# Configura tu clave de API de Groq aquí (gratuita)
groq_api_key = os.getenv('GROQ_API_KEY')
USE_MOCK = not groq_api_key
client = Groq(api_key=groq_api_key) if groq_api_key else None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'Mensaje vacío'}), 400

    if USE_MOCK:
        # Respuesta simulada
        ai_message = f"Respuesta simulada a: '{user_message}'. Configura tu clave de API de Groq para respuestas reales."
        return jsonify({'response': ai_message})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Modelo gratuito de Groq
            messages=[
                {"role": "system", "content": "Eres un asistente útil."},
                {"role": "user", "content": user_message}
            ]
        )
        ai_message = response.choices[0].message.content
        return jsonify({'response': ai_message})
    except Exception as e:
        print(f"Error en la API de Groq: {e}")
        # Fallback a respuesta simulada si hay error
        ai_message = f"Error en la API. Respuesta simulada a: '{user_message}'. Verifica tu conexión a internet o clave API."
        return jsonify({'response': ai_message})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
