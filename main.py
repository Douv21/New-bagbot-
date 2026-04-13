from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

# Chemin du fichier de configuration
CONFIG_FILE = 'config.json'

def load_db():
    if not os.path.exists(CONFIG_FILE):
        # Structure par défaut si le fichier n'existe pas
        default_data = {
            "config": {
                "welcome": {
                    "title": "Bienvenue !",
                    "desc": "Bienvenue sur le serveur {user}",
                    "footer": "BagBot Elite",
                    "color": "#ed4245",
                    "channel": "",
                    "thumbnail": "",
                    "banner": "",
                    "footer_icon": "",
                    "trigger_roles": []
                },
                "leave": {
                    "title": "Au revoir",
                    "desc": "{user} nous a quitté.",
                    "footer": "BagBot Elite",
                    "color": "#ed4245",
                    "channel": "",
                    "thumbnail": "",
                    "banner": "",
                    "footer_icon": ""
                },
                "admin_roles": []
            },
            "channels": [
                {"id": "123456789", "name": "general"},
                {"id": "987654321", "name": "bagbot-install"}
            ],
            "roles": ["Fondateur", "Admin", "Modérateur", "Bot", "Membre"],
            "images": [],
            "server_info": {
                "name": "Mon Super Serveur",
                "member_count": "150"
            }
        }
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, indent=4)
        return default_data
    
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_data')
def get_data():
    return jsonify(load_db())

@app.route('/api/save', list_methods=['POST'])
def save_data():
    new_config = request.json
    db = load_db()
    db['config'] = new_config
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload():
    # Simulation d'upload pour l'exemple
    return jsonify({"path": "https://via.placeholder.com/800x400"})

@app.route('/api/test_message', methods=['POST'])
def test_message():
    data = request.json
    print(f"Test envoyé dans le salon {data['config']['channel']}")
    return jsonify({"status": "sent"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=49501, debug=True)
    
