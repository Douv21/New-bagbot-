import os
import json
import asyncio
import discord
from discord.ext import commands
from flask import Flask, render_template, session, request, jsonify, redirect

# --- CONFIGURATION ---
TOKEN = "TON_TOKEN"
CLIENT_ID = "TON_CLIENT_ID"
CLIENT_SECRET = "TON_CLIENT_SECRET"
REDIRECT_URI = "http://192.168.1.133:49501/login/callback"
GUILD_ID = 123456789  # ID de ton serveur Discord

app = Flask(__name__, static_folder='public', static_url_for_path='/')
app.secret_key = os.urandom(24)

# Dossiers
UPLOAD_FOLDER = 'public/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

def load_config():
    if not os.path.exists('config.json'):
        return {"welcome": {"title": "", "desc": "", "footer": "", "channel": "", "banner": "", "thumbnail": ""}, "admin_roles": []}
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
    if not guild: return jsonify({"error": "Guild non trouvée"}), 404

    config = load_config()
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('png', 'jpg', 'jpeg'))]
    
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if r.name != "@everyone"],
        "config": config,
        "images": images,
        "user_name": session.get('user_name', 'Admin')
    })

@app.route('/api/save', methods=['POST'])
def save():
    if 'user_id' not in session: return jsonify({"error": "Auth"}), 401
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4)
    return jsonify({"status": "ok"})

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    if 'user_id' not in session: return jsonify({"error": "Auth"}), 401
    cfg = load_config().get('welcome', {})
    channel = bot.get_channel(int(cfg.get('channel', 0)))
    if not channel: return jsonify({"error": "Salon non trouvé"}), 400

    # Remplacement des variables
    u = session.get('user_name', 'Testeur')
    g = channel.guild.name
    c = str(channel.guild.member_count)
    def rep(t): return t.replace('{user}', u).replace('{guild}', g).replace('{count}', c) if t else ""

    embed = discord.Embed(title=rep(cfg.get('title')), description=rep(cfg.get('desc')), color=0xed4245)
    if cfg.get('banner'): embed.set_image(url=cfg.get('banner'))
    if cfg.get('thumbnail'): embed.set_thumbnail(url=cfg.get('thumbnail'))
    if cfg.get('footer'): embed.set_footer(text=rep(cfg.get('footer')))

    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "ok"})

@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/login/callback')
def callback():
    session['user_id'] = "simulate" # Pour le test
    session['user_name'] = "Admin"
    return redirect('/')

if __name__ == "__main__":
    import threading
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    bot.run(TOKEN)
    
