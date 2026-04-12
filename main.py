import os
import json
import asyncio
import discord
from discord.ext import commands
from flask import Flask, render_template, session, request, jsonify, redirect

# --- CONFIGURATION (À REMPLIR) ---
TOKEN = "TON_TOKEN_ICI"
CLIENT_ID = "TON_CLIENT_ID"
CLIENT_SECRET = "TON_CLIENT_SECRET"
REDIRECT_URI = "http://192.168.1.133:49501/login/callback"
GUILD_ID = 123456789012345678  # Remplace par l'ID de ton serveur

app = Flask(__name__, static_folder='public', static_url_for_path='/')
app.secret_key = os.urandom(24)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- GESTION DATA ---
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
    if not guild: return jsonify({"error": "Guild non trouvée"}), 404

    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if r.name != "@everyone"],
        "config": load_config(),
        "images": [f"/uploads/{f}" for f in os.listdir('public/uploads')] if os.path.exists('public/uploads') else [],
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
    channel = bot.get_channel(int(config.get('channel', 0)))
    if not channel: return jsonify({"error": "Salon invalide"}), 400

    u_name = session.get('user_name', 'Testeur')
    def clean(t): return t.replace('{user}', u_name).replace('{guild}', channel.guild.name).replace('{count}', str(channel.guild.member_count))

    embed = discord.Embed(title=clean(config.get('title','')), description=clean(config.get('desc','')), color=0xed4245)
    if config.get('banner'): embed.set_image(url=config.get('banner'))
    if config.get('thumbnail'): embed.set_thumbnail(url=config.get('thumbnail'))
    if config.get('footer'): embed.set_footer(text=clean(config.get('footer')))

    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "ok"})

# --- OAUTH2 SIMPLIFIÉ ---
@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/login/callback')
def callback():
    # Simulation de session pour le développement local
    session['user_id'] = "123"
    session['user_name'] = "Admin"
    return redirect('/')

if __name__ == "__main__":
    import threading
    os.makedirs('public/uploads', exist_ok=True)
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    bot.run(TOKEN)
    
