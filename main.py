import os
import json
import discord
import threading
import asyncio
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect
from dotenv import load_dotenv

# --- INITIALISATION ET CHARGEMENT ---
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

# Configuration Flask (Correction stricte du static_url_path pour Termux)
app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

# Configuration Bot Discord
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- GESTION DE LA PERSISTANCE (JSON) ---
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
            # On s'assure que toutes les clés existent (Merge)
            for key in default_cfg["welcome"]:
                if key not in data.get("welcome", {}):
                    if "welcome" not in data: data["welcome"] = {}
                    data["welcome"][key] = default_cfg["welcome"][key]
            return data
    except Exception:
        return default_cfg

# --- ROUTES API POUR LE FRONTEND ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    # Force la récupération de la guild pour éviter le cache vide
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return jsonify({"error": "Guild non trouvée. Vérifiez GUILD_ID."}), 404

    # Scan des images pour la galerie
    img_dir = 'public/uploads'
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)
    images = [f"/uploads/{f}" for f in os.listdir(img_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]

    # Construction de l'objet de données complet
    response = {
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if not r.managed and r.name != "@everyone"],
        "config": load_config(),
        "images": images,
        "guild_name": guild.name,
        "user_name": session.get('user_name', 'Administrateur')
    }
    return jsonify(response)

@app.route('/api/save', methods=['POST'])
def save():
    try:
        new_data = request.json
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(new_data, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- OAUTH2 SIMULATION / LOGIN ---
@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/api/callback')
def callback():
    session['user_id'] = "admin"
    session['user_name'] = "Admin BagBot"
    return redirect('/')

# --- LANCEMENT ---
def start_web():
    app.run(host='0.0.0.0', port=49501, use_reloader=False)

if __name__ == "__main__":
    # Threading pour Flask
    t = threading.Thread(target=start_web)
    t.daemon = True
    t.start()
    
    # Lancement Bot
    try:
        bot.run(TOKEN)
    except Exception as e:
        print(f"Erreur Bot: {e}")
        
