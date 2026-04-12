import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory, session, redirect
import requests
import threading
import json
import os
from dotenv import load_dotenv

# Chargement du .env
load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID = os.getenv("GUILD_ID")
OWNER_ID = os.getenv("OWNER_ID")
REDIRECT_URI = "http://192.168.1.133:49501/api/callback"

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

intents = discord.Intents.default()
intents.members = True 
intents.guilds = True
bot = commands.Bot(command_prefix="!", intents=intents)

# --- SECURITÉ & OAUTH2 ---
@app.route('/api/login')
def login():
    if not CLIENT_ID: return "Erreur: CLIENT_ID manquant dans le .env", 500
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/api/callback')
def callback():
    code = request.args.get('code')
    data = { 'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, 'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI }
    r = requests.post('https://discord.com/api/oauth2/token', data=data)
    token = r.json().get('access_token')
    user_data = requests.get('https://discord.com/api/users/@me', headers={'Authorization': f'Bearer {token}'}).json()
    session['user_id'] = user_data.get('id')
    return redirect('/')

def check_access():
    uid = session.get('user_id')
    if not uid: return False
    if str(uid) == str(OWNER_ID): return True
    config = load_config()
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return False
    member = guild.get_member(int(uid))
    if member:
        member_roles = [r.name for r in member.roles]
        return any(role in member_roles for role in config.get('admin_roles', []))
    return False

# --- ROUTES API ---
@app.route('/api/get_server_info')
def get_server_info():
    if not check_access(): return jsonify({"status": "unauthorized"}), 401
    config = load_config()
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return jsonify({"status": "error", "message": "Serveur introuvable"}), 404
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    return jsonify({"status": "success", "channels": channels, "all_roles": roles, "config": config})

@app.route('/api/save_config', methods=['POST'])
def save_config():
    if not check_access(): return jsonify({"status": "unauthorized"}), 401
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "success"})

@app.route('/api/images')
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/public/uploads/{f}" for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]})

@app.route('/api/upload', methods=['POST'])
def upload():
    if not check_access(): return jsonify({"status": "unauthorized"}), 401
    file = request.files['file']
    filename = file.filename.replace(" ", "_")
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    return jsonify({"status": "success", "path": f"/public/uploads/{filename}"})

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    config = load_config().get('welcome', {})
    channel = bot.get_channel(int(config.get('channel')))
    if not channel: return jsonify({"status": "error"}), 400
    embed = discord.Embed(title=config.get('title'), description=config.get('desc'), color=0xed4245)
    if config.get('banner'):
        embed.set_image(url=f"http://{request.host}{config['banner']}")
    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "success"})

@app.route('/')
def index(): return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path): return send_from_directory('public', path)

if __name__ == '__main__':
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501), daemon=True).start()
    bot.run(TOKEN)
    
