import os
import json
import discord
import threading
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect
from dotenv import load_dotenv

# --- CHARGEMENT DU .ENV ---
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID = int(os.getenv("GUILD_ID")) if os.getenv("GUILD_ID") else 0

# --- CONFIGURATION URI ---
# Cette URL doit être COPIÉE/COLLÉE dans le Discord Developer Portal (OAuth2 -> Redirects)
REDIRECT_URI = "http://192.168.1.133:49501/api/callback"

# --- INITIALISATION FLASK ---
app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

# --- INITIALISATION BOT ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def load_config():
    if not os.path.exists('config.json'):
        return {"welcome": {}, "admin_roles": []}
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)

# --- ROUTES DASHBOARD ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    if 'user_id' not in session: return jsonify({"error": "Auth"}), 401
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Serveur non trouvé"}), 404
    
    img_dir = 'public/uploads'
    images = [f"/uploads/{f}" for f in os.listdir(img_dir)] if os.path.exists(img_dir) else []
    
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if r.name != "@everyone"],
        "config": load_config(),
        "images": images,
        "user_name": session.get('user_name', 'Admin')
    })

@app.route('/api/save', methods=['POST'])
def save():
    if 'user_id' not in session: return jsonify({"error": "Auth"}), 401
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4)
    return jsonify({"status": "ok"})

# --- SYSTÈME LOGIN OAUTH2 ---
@app.route('/api/login')
def login():
    # Lien d'autorisation envoyé à Discord
    url = (f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}"
           f"&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")
    return redirect(url)

@app.route('/api/callback')
def callback():
    # Discord renvoie l'utilisateur ici après autorisation
    # On simule la session pour le Dashboard
    session['user_id'] = "admin_access"
    session['user_name'] = "Administrateur"
    return redirect('/')

# --- LANCEMENT ---
if __name__ == "__main__":
    # threading pour faire tourner Flask et le Bot en même temps
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    bot.run(TOKEN)
    
