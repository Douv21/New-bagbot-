import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
import requests
import threading
import json
import os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = "TON_CLIENT_ID"
CLIENT_SECRET = "TON_CLIENT_SECRET"
REDIRECT_URI = "http://localhost:49501/api/callback" # À adapter selon ton IP

app = Flask(__name__)
app.secret_key = os.urandom(24)

UPLOAD_FOLDER = 'public/uploads'
CONFIG_FILE = 'config.json'
OWNER_ID = "TON_ID_DISCORD" # Ton ID pour l'accès permanent

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except: return {"welcome": {}, "admin_roles": []}
    return {"welcome": {}, "admin_roles": []}

intents = discord.Intents.default()
intents.members = True 
intents.guilds = True
bot = commands.Bot(command_prefix="!", intents=intents)

# --- AUTHENTIFICATION ---
@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/api/callback')
def callback():
    code = request.args.get('code')
    data = { 'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, 'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI }
    r = requests.post('https://discord.com/api/oauth2/token', data=data)
    token = r.json().get('access_token')
    user_data = requests.get('https://discord.com/api/users/@me', headers={'Authorization': f'Bearer {token}'}).json()
    
    session['user_id'] = user_data['id']
    return redirect('/')

def check_access():
    if 'user_id' not in session: return False
    if session['user_id'] == OWNER_ID: return True
    
    config = load_config()
    allowed_roles = config.get('admin_roles', [])
    guild = bot.guilds[0]
    member = guild.get_member(int(session['user_id']))
    
    if member:
        member_roles = [r.name for r in member.roles]
        return any(role in member_roles for role in allowed_roles)
    return False

# --- API ---
@app.route('/api/get_server_info')
def get_server_info():
    if not check_access(): return jsonify({"status": "unauthorized"}), 401
    config = load_config()
    guild = bot.guilds[0]
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    return jsonify({"status": "success", "channels": channels, "all_roles": roles, "config": config})

@app.route('/api/save_config', methods=['POST'])
def save_config():
    if not check_access(): return jsonify({"status": "unauthorized"}), 401
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4)
    return jsonify({"status": "success"})

# ... (Garder les routes images et test de la réponse précédente)

if __name__ == '__main__':
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501), daemon=True).start()
    bot.run(TOKEN)
    
