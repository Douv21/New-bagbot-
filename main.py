import os
import json
import discord
import threading
import asyncio
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect
from dotenv import load_dotenv

# --- CHARGEMENT DES VARIABLES D'ENVIRONNEMENT ---
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID_STR = os.getenv("GUILD_ID")
REDIRECT_URI = os.getenv("REDIRECT_URI")

# Validation de l'ID Guild
try:
    GUILD_ID = int(GUILD_ID_STR) if GUILD_ID_STR else 0
except ValueError:
    GUILD_ID = 0

# --- INITIALISATION FLASK ---
app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

# --- INITIALISATION BOT DISCORD ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def load_config():
    """Charge la configuration depuis le fichier JSON avec des valeurs par défaut."""
    default = {
        "welcome": {
            "title": "", 
            "desc": "", 
            "footer": "", 
            "channel": "", 
            "banner": "", 
            "thumbnail": "", 
            "trigger_roles": []
        },
        "admin_roles": []
    }
    if not os.path.exists('config.json'):
        return default
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Fusion avec default pour éviter les clés manquantes
            for key in default["welcome"]:
                if key not in data.get("welcome", {}):
                    if "welcome" not in data: data["welcome"] = {}
                    data["welcome"][key] = default["welcome"][key]
            return data
    except Exception:
        return default

# --- ROUTES API ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    if 'user_id' not in session:
        return jsonify({"error": "Non authentifié"}), 401
    
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        # Tentative de récupération forcée si le cache est vide
        return jsonify({"error": f"Bot non présent sur le serveur ID: {GUILD_ID}"}), 404
    
    # Récupération des images locales
    img_dir = 'public/uploads'
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)
    images = [f"/uploads/{f}" for f in os.listdir(img_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    
    # Construction de la réponse complète
    data = {
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if not r.managed and r.name != "@everyone"],
        "config": load_config(),
        "images": images,
        "user_name": session.get('user_name', 'Administrateur'),
        "guild_name": guild.name
    }
    return jsonify(data)

@app.route('/api/save', methods=['POST'])
def save():
    if 'user_id' not in session:
        return jsonify({"error": "Non autorisé"}), 401
    
    try:
        new_config = request.json
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(new_config, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/login')
def login():
    discord_url = (
        f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify"
    )
    return redirect(discord_url)

@app.route('/api/callback')
def callback():
    # Simulation d'auth pour Termux (plus stable sans requests complexe)
    session['user_id'] = "admin_local"
    session['user_name'] = "Admin BagBot"
    return redirect('/')

# --- LANCEMENT ---
def run_flask():
    app.run(host='0.0.0.0', port=49501, use_reloader=False)

if __name__ == "__main__":
    print(f"Lancement du Bot sur le serveur : {GUILD_ID}")
    t = threading.Thread(target=run_flask)
    t.daemon = True
    t.start()
    
    try:
        bot.run(TOKEN)
    except Exception as e:
        print(f"Erreur de lancement Discord : {e}")
        
