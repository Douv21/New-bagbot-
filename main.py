import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory
import threading
import json
import os
import asyncio

# --- CONFIGURATION ET DOSSIERS ---
app = Flask(__name__)
UPLOAD_FOLDER = 'public/uploads'
CONFIG_FILE = 'config.json'

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

# --- BOT DISCORD CONFIGURATION ---
intents = discord.Intents.default()
intents.members = True 
intents.guilds = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ BagBot est en ligne : {bot.user.name}")

# --- ROUTES API POUR LE PANEL ---

@app.route('/api/get_server_info', methods=['GET'])
def get_server_info():
    config = load_config()
    
    # Vérification si le bot est prêt et a accès à un serveur
    if not bot.is_ready() or not bot.guilds:
        return jsonify({
            "status": "loading", 
            "channels": [], 
            "all_roles": [], 
            "config": config
        })
    
    try:
        guild = bot.guilds[0]
        # Récupération des salons textuels uniquement
        channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
        # Récupération des rôles (on ignore @everyone)
        roles = [r.name for r in guild.roles if r.name != "@everyone"]
        
        return jsonify({
            "status": "success",
            "channels": channels,
            "all_roles": roles,
            "config": config
        })
    except Exception as e:
        print(f"Erreur get_server_info: {e}")
        return jsonify({"status": "error", "message": str(e)})

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
    if not os.path.exists(UPLOAD_FOLDER):
        return jsonify({"images": []})
    files = os.listdir(UPLOAD_FOLDER)
    imgs = [f"/public/uploads/{f}" for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    return jsonify({"images": imgs})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "Aucun fichier"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "Nom vide"}), 400
    
    file.save(os.path.join(UPLOAD_FOLDER, file.filename))
    return jsonify({"status": "success"})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        data = request.json
        img_path = data.get('image', '').lstrip('/')
        if os.path.exists(img_path):
            os.remove(img_path)
            return jsonify({"status": "success"})
        return jsonify({"status": "error", "message": "Fichier introuvable"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    try:
        config = load_config().get('welcome', {})
        chan_id = config.get('channel')
        
        if not chan_id:
            return jsonify({"status": "error", "message": "Configuration incomplète"}), 400
            
        channel = bot.get_channel(int(chan_id))
        if not channel:
            return jsonify({"status": "error", "message": "Salon introuvable"}), 404

        guild = bot.guilds[0]
        
        # Logique de remplacement des variables
        def replace_vars(text):
            if not text: return ""
            return text.replace("{user}", bot.user.name).replace("{server}", guild.name).replace("{count}", str(guild.member_count))

        title = replace_vars(config.get('title', 'Bienvenue'))
        desc = replace_vars(config.get('desc', ''))
        footer_text = replace_vars(config.get('footer', 'BagBot'))

        embed = discord.Embed(title=title, description=desc, color=0xed4245)
        
        # URLs pour les images (gestion local vs http)
        base_url = f"http://{request.host}"
        
        if config.get('thumb'):
            url = config['thumb'] if config['thumb'].startswith('http') else f"{base_url}{config['thumb']}"
            embed.set_thumbnail(url=url)
            
        if config.get('banner'):
            url = config['banner'] if config['banner'].startswith('http') else f"{base_url}{config['banner']}"
            embed.set_image(url=url)
            
        if config.get('footer_icon'):
            f_url = config['footer_icon'] if config['footer_icon'].startswith('http') else f"{base_url}{config['footer_icon']}"
            embed.set_footer(text=footer_text, icon_url=f_url)
        else:
            embed.set_footer(text=footer_text)

        bot.loop.create_task(channel.send(embed=embed))
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur test_welcome: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- SERVEUR DE FICHIERS STATIQUES ---

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path):
    return send_from_directory('public', path)

# --- LANCEMENT MULTI-THREAD ---

def run_flask():
    # On désactive le reloader pour éviter les conflits de threads avec Discord
    app.run(host='0.0.0.0', port=49501, debug=False, use_reloader=False)

if __name__ == '__main__':
    # Lancement de Flask dans un thread séparé
    t = threading.Thread(target=run_flask)
    t.daemon = True
    t.start()
    
    # Lancement du Bot Discord
    try:
        bot.run("TON_TOKEN_ICI")
    except Exception as e:
        print(f"❌ Impossible de lancer le bot : {e}")
        
