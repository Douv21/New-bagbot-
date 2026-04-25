from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

# Dossiers pour les données et images
DATA_FILE = 'data.json'
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def load_db():
    if not os.path.exists(DATA_FILE):
        return {
            "channels": [{"id": "1", "name": "general"}, {"id": "2", "name": "bienvenue"}],
            "roles": ["Admin", "Modo", "Membre"],
            "images": [],
            "config": {
                "welcome": {"title": "Bienvenue {user}", "desc": "Bienvenue sur {server}", "color": "#ed4245", "footer": "BagBot Elite"},
                "leave": {"title": "Départ", "desc": "{user} nous a quitté", "color": "#ed4245"}
            }
        }
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_data')
def get_data():
    return jsonify(load_db())

@app.route('/api/save', methods=['POST'])
def save_data():
    db = load_db()
    new_config = request.json
    db['config'] = new_config
    with open(DATA_FILE, 'w') as f:
        json.dump(db, f, indent=4)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files['file']
    if file:
        path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(path)
        db = load_db()
        img_url = '/' + path
        if img_url not in db['images']:
            db['images'].append(img_url)
            with open(DATA_FILE, 'w') as f:
                json.dump(db, f, indent=4)
        return jsonify({"path": img_url})
    return jsonify({"error": "failed"}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    
