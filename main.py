import os
import json
import discord
import threading
import asyncio
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = int(os.getenv("GUILD_ID", 0))

# On définit le dossier public explicitement
# static_folder='public' dit à Flask d'aller chercher index.html dedans
app = Flask(__name__, static_folder='public')
app.secret_key = os.urandom(24)

# Le chemin des uploads est public/uploads pour que le site y ait accès
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'public', 'uploads')
if not os.path.exists(UPLOAD_FOLDER): 
    os.makedirs(UPLOAD_FOLDER)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- CONFIG ---
def load_config():
    if not os.path.exists('config.json'):
        return {"welcome": {}, "leave": {}, "admin_roles": []}
    with open('config.json', 'r', encoding='utf-8') as f: 
        return json.load(f)

# --- ROUTES ---

@app.route('/')
def index():
    # Envoie le index.html qui se trouve dans le dossier /public
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Serveur non trouvé"}), 404
    
    # On liste les images dans public/uploads
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    roles = [r.name for r in guild.roles if not r.managed and r.name != "@everyone"]
    
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": roles, 
        "config": load_config(), 
        "images": images,
        "server_info": {"name": guild.name, "member_count": guild.member_count}
    })

# Route pour servir les images depuis public/uploads
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files.get('file')
    if file:
        fname = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER, fname))
        return jsonify({"path": f"/uploads/{fname}"})
    return jsonify({"error": "No file"}), 400

@app.route('/api/save', methods=['POST'])
def save():
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "ok"})

# --- BOT & FLASK ---
def run_flask():
    # Le port 49501 comme sur tes captures
    app.run(host='0.0.0.0', port=49501)

if __name__ == "__main__":
    threading.Thread(target=run_flask, daemon=True).start()
    bot.run(TOKEN)
    
