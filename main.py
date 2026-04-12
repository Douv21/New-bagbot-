import os
import json
import asyncio
import discord
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect

# --- CONFIGURATION ---
TOKEN = "TON_TOKEN_ICI"
CLIENT_ID = "TON_ID_ICI"
CLIENT_SECRET = "TON_SECRET_ICI"
REDIRECT_URI = "http://192.168.1.133:49501/login/callback"
GUILD_ID = 123456789012345678 # Ton ID de serveur

app = Flask(__name__, static_folder='public', static_url_for_path='/')
app.secret_key = os.urandom(24)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- FONCTIONS DATA ---
def load_config():
    if not os.path.exists('config.json'):
        return {"welcome": {}, "admin_roles": []}
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_config(data):
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

# --- ROUTES API ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    if 'user_id' not in session: return jsonify({"error": "Auth"}), 401
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Serveur introuvable"}), 404

    # Scan des images
    img_dir = 'public/uploads'
    images = [f"/uploads/{f}" for f in os.listdir(img_dir)] if os.path.exists(img_dir) else []

    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if r.name != "@everyone"],
        "config": load_config(),
        "images": images,
        "user_name": session.get('user_name', 'Utilisateur')
    })

@app.route('/api/save', methods=['POST'])
def save():
    if 'user_id' not in session: return jsonify({"error": "Auth"}), 401
    save_config(request.json)
    return jsonify({"status": "ok"})

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    config = load_config().get('welcome', {})
    chan_id = config.get('channel')
    if not chan_id: return jsonify({"error": "Pas de salon"}), 400
    
    channel = bot.get_channel(int(chan_id))
    if not channel: return jsonify({"error": "Salon introuvable"}), 404

    # Nettoyage des variables
    u = session.get('user_name', 'Testeur')
    g = channel.guild.name
    def rep(t): return t.replace('{user}', u).replace('{guild}', g).replace('{count}', str(channel.guild.member_count)) if t else ""

    embed = discord.Embed(title=rep(config.get('title')), description=rep(config.get('desc')), color=0xed4245)
    if config.get('banner'): embed.set_image(url=config.get('banner'))
    if config.get('thumbnail'): embed.set_thumbnail(url=config.get('thumbnail'))
    if config.get('footer'): embed.set_footer(text=rep(config.get('footer')))

    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "ok"})

# --- LOGIN ---
@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/login/callback')
def callback():
    session['user_id'] = "999"
    session['user_name'] = "Administrateur"
    return redirect('/')

if __name__ == "__main__":
    import threading
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    bot.run(TOKEN)
    
