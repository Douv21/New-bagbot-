import os
import json
import discord
import threading
import asyncio
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect
from dotenv import load_dotenv

# --- CHARGEMENT DES VARIABLES ---
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID_STR = os.getenv("GUILD_ID")
REDIRECT_URI = os.getenv("REDIRECT_URI")

try:
    GUILD_ID = int(GUILD_ID_STR) if GUILD_ID_STR else 0
except:
    GUILD_ID = 0

# --- INITIALISATION FLASK (Correction du bug static_url_path) ---
app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

# --- INITIALISATION BOT ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def load_config():
    default = {
        "welcome": {"title": "", "desc": "", "footer": "", "channel": "", "banner": "", "thumbnail": "", "trigger_roles": []},
        "admin_roles": []
    }
    if not os.path.exists('config.json'): return default
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except: return default

# --- ROUTES API ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    # On bypass temporairement l'auth session pour tes tests si tu as des soucis d'OAuth
    guild = bot.get_guild(GUILD_ID)
    
    # Si le cache est vide, on essaie de forcer la récupération
    if not guild:
        return jsonify({"error": "Serveur non trouvé. Vérifie l'ID dans le .env"}), 404

    img_dir = 'public/uploads'
    if not os.path.exists(img_dir): os.makedirs(img_dir)
    images = [f"/uploads/{f}" for f in os.listdir(img_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
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
        data = request.json
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/api/callback')
def callback():
    session['user_id'] = "admin" # Simulation pour éviter les erreurs de redirect Discord
    return redirect('/')

def run_flask():
    app.run(host='0.0.0.0', port=49501, use_reloader=False)

if __name__ == "__main__":
    t = threading.Thread(target=run_flask)
    t.daemon = True
    t.start()
    bot.run(TOKEN)
    
