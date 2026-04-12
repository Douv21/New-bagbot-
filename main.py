import os
import json
import asyncio
import discord
from discord.ext import commands
from flask import Flask, render_template, session, request, jsonify, redirect, url_path_for

# --- CONFIGURATION ---
TOKEN = "TON_TOKEN_BOT"
CLIENT_ID = "TON_CLIENT_ID"
CLIENT_SECRET = "TON_CLIENT_SECRET"
REDIRECT_URI = "http://192.168.1.133:49501/login/callback" # À vérifier selon tes tests
GUILD_ID = 123456789012345678 # Ton ID de serveur

app = Flask(__name__, static_folder='public', static_url_for_path='/')
app.secret_key = os.urandom(24)

# Dossier pour les images
UPLOAD_FOLDER = 'public/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- BOT DISCORD ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def load_config():
    if not os.path.exists('config.json'):
        return {"welcome": {}, "admin_roles": []}
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_config(data):
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

# --- ROUTES FLASK ---

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return jsonify({"error": "Guild not found"}), 404

    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    
    # Récupération des images locales
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('png', 'jpg', 'jpeg', 'gif'))]
    
    return jsonify({
        "channels": channels,
        "roles": roles,
        "config": load_config(),
        "images": images,
        "user_name": session.get('user_name', 'Utilisateur')
    })

@app.route('/api/save', methods=['POST'])
def save():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    save_config(request.json)
    return jsonify({"status": "ok"})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No filename"}), 400
    
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)
    return jsonify({"url": f"/uploads/{file.filename}"})

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    config = load_config()
    w = config.get('welcome', {})
    channel_id = w.get('channel')
    
    if not channel_id:
        return jsonify({"error": "No channel set"}), 400
        
    channel = bot.get_channel(int(channel_id))
    if not channel:
        return jsonify({"error": "Channel not found"}), 404

    # Simulation des variables pour le test
    user_name = session.get('user_name', 'Testeur')
    guild_name = channel.guild.name
    count = str(channel.guild.member_count)

    def replace_vars(text):
        if not text: return ""
        return text.replace('{user}', user_name).replace('{guild}', guild_name).replace('{count}', count)

    embed = discord.Embed(
        title=replace_vars(w.get('title', 'Bienvenue !')),
        description=replace_vars(w.get('desc', 'Contenu du message')),
        color=0xed4245
    )
    
    if w.get('thumbnail'): embed.set_thumbnail(url=w.get('thumbnail'))
    if w.get('banner'): embed.set_image(url=w.get('banner'))
    if w.get('footer'): embed.set_footer(text=replace_vars(w.get('footer')))

    # Envoi asynchrone via la loop du bot
    bot.loop.create_task(channel.send(content=f"🛠️ **TEST DASHBOARD** pour {user_name}", embed=embed))
    return jsonify({"status": "success"})

# --- OAUTH2 DISCORD (Simplifié) ---

@app.route('/api/login')
def login():
    scope = "identify guilds"
    discord_login_url = f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope={scope}"
    return redirect(discord_login_url)

@app.route('/login/callback')
def callback():
    # Ici tu devrais normalement échanger le 'code' contre un 'access_token' via l'API Discord
    # Pour ton test local, on simule une connexion réussie
    session['user_id'] = "12345" 
    session['user_name'] = "Admin"
    return redirect('/')

# --- LANCEMENT ---

@bot.event
async def on_ready():
    print(f"✅ Bot connecté en tant que {bot.user}")

async def run_all():
    # Lancement du bot en tâche de fond
    bot_task = asyncio.create_task(bot.start(TOKEN))
    # Lancement de Flask
    # Note: On utilise pas app.run() ici pour ne pas bloquer l'asyncio
    import threading
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    await bot_task

if __name__ == "__main__":
    try:
        asyncio.run(run_all())
    except KeyboardInterrupt:
        pass
        
