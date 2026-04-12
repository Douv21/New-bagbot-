import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory, session, redirect
import requests, threading, os, json
from dotenv import load_dotenv

# Chargement des variables
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID = os.getenv("GUILD_ID")
OWNER_ID = os.getenv("OWNER_ID")
REDIRECT_URI = os.getenv("REDIRECT_URI")

app = Flask(__name__)
app.secret_key = os.urandom(24)
UPLOAD_FOLDER = 'public/uploads'
CONFIG_FILE = 'config.json'

if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except: return {"welcome": {}, "admin_roles": []}
    return {"welcome": {}, "admin_roles": []}

# Configuration du Bot
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- AUTHENTIFICATION ---
@app.route('/api/login')
def login():
    # Génère l'URL de connexion vers Discord
    url = (f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}"
           f"&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")
    return redirect(url)

@app.route('/api/callback')
def callback():
    code = request.args.get('code')
    data = {
        'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI
    }
    r = requests.post('https://discord.com/api/oauth2/token', data=data)
    resp = r.json()
    if 'access_token' in resp:
        user = requests.get('https://discord.com/api/users/@me', 
                            headers={'Authorization': f'Bearer {resp["access_token"]}'}).json()
        session['user_id'] = user.get('id')
        return redirect('/')
    return f"Erreur Discord : {resp}", 400

def check_access():
    uid = session.get('user_id')
    if not uid: return False
    if str(uid) == str(OWNER_ID): return True
    config = load_config()
    guild = bot.get_guild(int(GUILD_ID))
    member = guild.get_member(int(uid)) if guild else None
    return any(r.name in config.get('admin_roles', []) for r in member.roles) if member else False

# --- API ---
@app.route('/api/get_server_info')
def get_server_info():
    if not check_access(): return jsonify({"status": "unauthorized"}), 401
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return jsonify({"status": "error", "message": "Guild introuvable"}), 404
    
    return jsonify({
        "status": "success",
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "all_roles": [r.name for r in guild.roles if r.name != "@everyone"],
        "config": load_config()
    })

@app.route('/api/save_config', methods=['POST'])
def save_config():
    if not check_access(): return jsonify({"status": "unauthorized"}), 401
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "success"})

# --- STATIQUES ---
@app.route('/')
def index(): return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path): return send_from_directory('public', path)

if __name__ == '__main__':
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501), daemon=True).start()
    bot.run(TOKEN)
    
