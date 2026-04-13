from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

# Fichier de stockage
CONFIG_FILE = 'config.json'

def load_db():
    if not os.path.exists(CONFIG_FILE):
        # Structure de secours si le fichier est absent
        db = {
            "config": {
                "welcome": {"title": "Bienvenue", "desc": "", "footer": "", "color": "#ed4245", "channel": "", "thumbnail": "", "banner": "", "footer_icon": "", "trigger_roles": []},
                "leave": {"title": "Départ", "desc": "", "footer": "", "color": "#ed4245", "channel": "", "thumbnail": "", "banner": "", "footer_icon": ""},
                "admin_roles": []
            },
            "channels": [],
            "roles": [],
            "images": [],
            "server_info": {"name": "Serveur Discord", "member_count": "0"}
        }
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=4)
        return db
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
    data = request.json
    db = load_db()
    db['config'] = data
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    # Ici, remplace par ton chemin de stockage réel (ex: /static/uploads/)
    path = f"static/uploads/{file.filename}"
    file.save(path)
    db = load_db()
    db['images'].append("/" + path)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4)
    return jsonify({"path": "/" + path})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    path = request.json.get('path')
    db = load_db()
    if path in db['images']:
        db['images'].remove(path)
        # Supprimer le fichier physiquement si nécessaire : os.remove(path.strip('/'))
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=4)
    return jsonify({"status": "success"})

@app.route('/api/test_message', methods=['POST'])
def test_message():
    # Logique pour que ton Bot Discord envoie le message en temps réel
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=49501, debug=True)
    
