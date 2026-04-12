import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory
import threading
import json
import os
import asyncio

# --- CONFIGURATION ---
app = Flask(__name__)
UPLOAD_FOLDER = 'public/uploads'
CONFIG_FILE = 'config.json'

# Création du dossier uploads s'il n'existe pas
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except:
                return {"welcome": {}, "admin_roles": []}
    return {"welcome": {}, "admin_roles": []}

# --- BOT DISCORD ---
intents = discord.Intents.default()
intents.members = True 
intents.guilds = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ BOT CONNECTÉ : {bot.user.name}")

# --- ROUTES API POUR TON HTML ---

@app.route('/api/get_server_info', methods=['GET'])
def get_server_info():
    config = load_config()
    # Sécurité : on attend que le bot soit prêt
    if not bot.is_ready() or not bot.guilds:
        return jsonify({"status": "loading", "channels": [], "all_roles": [], "config": config})
    
    guild = bot.guilds[0]
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    
    return jsonify({
        "status": "success",
        "channels": channels,
        "all_roles": roles,
        "config": config
    })

@app.route('/api/save_config', methods=['POST'])
def save_config():
    try:
        data = request.json
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/images', methods=['GET'])
def list_images():
    if not os.path.exists(UPLOAD_FOLDER): return jsonify({"images": []})
    files = os.listdir(UPLOAD_FOLDER)
    imgs = [f"/public/uploads/{f}" for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    return jsonify({"images": imgs})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files: return "No file", 400
    file = request.files['file']
    if file.filename == '': return "No filename", 400
    file.save(os.path.join(UPLOAD_FOLDER, file.filename))
    return jsonify({"status": "success"})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    data = request.json
    path = data.get('image', '').lstrip('/')
    if os.path.exists(path):
        os.remove(path)
        return jsonify({"status": "success"})
    return jsonify({"status": "error", "message": "Fichier introuvable"}), 404

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    config = load_config().get('welcome', {})
    chan_id = config.get('channel')
    if not chan_id: return "No channel", 400
    
    channel = bot.get_channel(int(chan_id))
    if not channel: return "Channel not found", 404

    # Gestion des variables {user}, {server}, {count}
    guild = bot.guilds[0]
    title = config.get('title', 'Bienvenue').replace("{user}", bot.user.name).replace("{server}", guild.name).replace("{count}", str(guild.member_count))
    desc = config.get('desc', '').replace("{user}", bot.user.mention).replace("{server}", guild.name).replace("{count}", str(guild.member_count))

    embed = discord.Embed(title=title, description=desc, color=0xed4245)
    
    # Construction de l'URL absolue pour les images
    base_url = f"http://{request.host}"
    if config.get('thumb'):
        url = config['thumb'] if config['thumb'].startswith('http') else f"{base_url}{config['thumb']}"
        embed.set_thumbnail(url=url)
    if config.get('banner'):
        url = config['banner'] if config['banner'].startswith('http') else f"{base_url}{config['banner']}"
        embed.set_image(url=url)
    
    footer_text = config.get('footer', 'BagBot').replace("{user}", bot.user.name).replace("{server}", guild.name).replace("{count}", str(guild.member_count))
    if config.get('footer_icon'):
        f_url = config['footer_icon'] if config['footer_icon'].startswith('http') else f"{base_url}{config['footer_icon']}"
        embed.set_footer(text=footer_text, icon_url=f_url)
    else:
        embed.set_footer(text=footer_text)
    
    # Envoi via le loop du bot
    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "success"})

# --- SERVEUR DE FICHIERS ---
@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path):
    return send_from_directory('public', path)

# --- LANCEMENT ---
def run_flask():
    # Utilisation du port 49501 comme demandé
    app.run(host='0.0.0.0', port=49501, debug=False, use_reloader=False)

if __name__ == '__main__':
    t = threading.Thread(target=run_flask)
    t.daemon = True
    t.start()
    
    try:
        bot.run("TON_TOKEN_ICI")
    except Exception as e:
        print(f"❌ Erreur de connexion Discord : {e}")
        
