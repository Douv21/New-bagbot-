import os
import json
import discord
import threading
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID = int(os.getenv("GUILD_ID")) if os.getenv("GUILD_ID") else 0
REDIRECT_URI = os.getenv("REDIRECT_URI")

app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

def load_config():
    if not os.path.exists('config.json'):
        return {
            "welcome": {"title": "", "desc": "", "footer": "", "channel": "", "banner": "", "thumbnail": "", "trigger_roles": []},
            "admin_roles": []
        }
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)

# --- ROUTES ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    if 'user_id' not in session: return jsonify({"error": "Auth"}), 401
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Serveur non trouvé"}), 404
    
    img_dir = 'public/uploads'
    if not os.path.exists(img_dir): os.makedirs(img_dir)
    images = [f"/uploads/{f}" for f in os.listdir(img_dir)]
    
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
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "ok"})

@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/api/callback')
def callback():
    session['user_id'] = "admin"
    session['user_name'] = "Administrateur"
    return redirect('/')

if __name__ == "__main__":
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    bot.run(TOKEN)
    
