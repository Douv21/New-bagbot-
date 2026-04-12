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
GUILD_ID = int(os.getenv("GUILD_ID"))
REDIRECT_URI = "http://192.168.1.133:49501/login/callback"

# --- INITIALISATION ---
# Correction de la ligne 14 (static_url_path) vue sur ton Termux
app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

def load_config():
    if not os.path.exists('config.json'):
        return {"welcome": {}, "admin_roles": []}
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)

# --- ROUTES API ---
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

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    config = load_config().get('welcome', {})
    channel = bot.get_channel(int(config.get('channel', 0)))
    if not channel: return jsonify({"error": "Salon invalide"}), 400

    u = session.get('user_name', 'Utilisateur')
    g = channel.guild.name
    c = str(channel.guild.member_count)
    
    def rep(t): return t.replace('{user}', u).replace('{guild}', g).replace('{count}', c) if t else ""

    embed = discord.Embed(title=rep(config.get('title')), description=rep(config.get('desc')), color=0xed4245)
    if config.get('banner'): embed.set_image(url=config.get('banner'))
    if config.get('thumbnail'): embed.set_thumbnail(url=config.get('thumbnail'))
    if config.get('footer'): embed.set_footer(text=rep(config.get('footer')))

    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "ok"})

@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/login/callback')
def callback():
    session['user_id'] = "admin"
    session['user_name'] = "Administrateur"
    return redirect('/')

if __name__ == "__main__":
    # On lance Flask dans un thread pour ne pas bloquer le Bot
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    bot.run(TOKEN)
    
