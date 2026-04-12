import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
import threading, json, os
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__, static_folder='public', static_url_path='')
UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return r

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

# --- GESTION IMAGES ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"status": "success", "url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/images/delete', methods=['POST'])
def delete_image():
    filename = request.json.get('url').split('/')[-1]
    path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(path): os.remove(path)
    return jsonify({"status": "success"})

# --- INFOS SERVEUR ---
@app.route('/api/get_server_info')
def get_info():
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return jsonify({"error": "Guild non trouvée"}), 404
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    return jsonify({"channels": channels, "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}})

@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    with open("config_bot.json", "w") as f:
        json.dump(request.json, f, indent=4)
    return jsonify({"status": "success"})

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
