from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

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
                "welcome": {"title": "", "desc": "", "color": "#ed4245", "footer": "", "channel": "", "banner": "", "thumbnail": "", "footer_icon": ""},
                "leave": {"title": "", "desc": "", "color": "#ed4245", "channel": "", "banner": ""}
            }
        }
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
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
    db['config'] = request.json
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files: return jsonify({"error": "no file"}), 400
    file = request.files['file']
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)
    db = load_db()
    img_url = '/' + path
    if img_url not in db['images']:
        db['images'].append(img_url)
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=4)
    return jsonify({"path": img_url})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    
