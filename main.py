from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

# Chemin du fichier de configuration
CONFIG_FILE = 'config.json'

def load_db():
    if not os.path.exists(CONFIG_FILE):
        default_data = {
            "config": {
                "welcome": {
                    "title": "Bienvenue !",
                    "desc": "Bienvenue sur le serveur {user}",
                    "footer": "BAGBOT ELITE V9",
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
                    "footer": "BAGBOT ELITE V9",
                    "color": "#ed4245",
                    "channel": "",
                    "thumbnail": "",
                    "banner": "",
                    "footer_icon": ""
                },
                "admin_roles": []
            },
            "channels": [
                {"id": "1", "name": "general"},
                {"id": "2", "name": "annonces"}
            ],
            "roles": ["@everyone", "Admin", "Modérateur", "Membre"],
            "images": [],
            "server_info": {
                "name": "BAGBOT SERVER",
                "member_count": "100"
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

@app.route('/api/save', methods=['POST'])
def save_data():
    config = request.json
    db = load_db()
    db['config'] = config
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files['file']
    # Logique d'enregistrement réelle à adapter selon ton environnement
    path = f"/static/uploads/{file.filename}"
    return jsonify({"path": path})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    path = request.json.get('path')
    db = load_db()
    if path in db['images']:
        db['images'].remove(path)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=4)
    return jsonify({"status": "success"})

@app.route('/api/test_message', methods=['POST'])
def test_message():
    data = request.json
    # Ici ton code bot envoie le message
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=49501, debug=True)
    
