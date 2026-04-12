import os
import json
import discord
import threading
import asyncio
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect
from dotenv import load_dotenv

# --- INITIALISATION ---
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID_STR = os.getenv("GUILD_ID")
REDIRECT_URI = os.getenv("REDIRECT_URI")

try:
    GUILD_ID = int(GUILD_ID_STR) if GUILD_ID_STR else 0
except ValueError:
    GUILD_ID = 0

app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def load_config():
    default_cfg = {
        "welcome": {
            "title": "Bienvenue {user} !",
            "desc": "Content de te voir sur {guild}.",
            "footer": "Nous sommes désormais {count}",
            "channel": "",
            "banner": "",
            "thumbnail": "",
            "trigger_roles": []
        },
        "admin_roles": []
    }
    if not os.path.exists('config.json'):
        return default_cfg
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data
    except Exception:
        return default_cfg

# --- ROUTES API ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return jsonify({"error": "Guild non trouvée"}), 404

    img_dir = 'public/uploads'
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)
    images = [f"/uploads/{f}" for f in os.listdir(img_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]

    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if not r.managed and r.name != "@everyone"],
        "config": load_config(),
        "images": images,
        "guild_name": guild.name
    })

@app.route('/api/save', methods=['POST'])
def save():
    try:
        new_data = request.json
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(new_data, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        img_path = request.json.get('path')
        # Sécurité : on empêche de sortir du dossier uploads
        if ".." in img_path or not img_path.startswith("/uploads/"):
            return jsonify({"error": "Chemin invalide"}), 400
        
        full_path = os.path.join('public', img_path.lstrip('/'))
        if os.path.exists(full_path):
            os.remove(full_path)
            return jsonify({"status": "deleted"})
        return jsonify({"error": "Fichier non trouvé"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def start_web():
    app.run(host='0.0.0.0', port=49501, use_reloader=False)

if __name__ == "__main__":
    t = threading.Thread(target=start_web)
    t.daemon = True
    t.start()
    bot.run(TOKEN)
    
