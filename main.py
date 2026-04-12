import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory
import threading
import json
import os

# --- INITIALISATION ---
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

# --- BOT DISCORD ---
intents = discord.Intents.default()
intents.members = True 
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot Discord prêt : {bot.user}")

# --- ROUTES API ---

@app.route('/api/get_server_info', methods=['GET'])
def get_server_info():
    config = load_config()
    # On attend que le bot soit connecté pour donner les infos
    if not bot.is_ready() or not bot.guilds:
        return jsonify({"channels": [], "all_roles": [], "config": config})
    
    guild = bot.guilds[0]
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if not r.is_default()]
    
    return jsonify({
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
    files = os.listdir(UPLOAD_FOLDER)
    imgs = [f"/public/uploads/{f}" for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    return jsonify({"images": imgs})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files: return "No file", 400
    file = request.files['file']
    if file:
        file.save(os.path.join(UPLOAD_FOLDER, file.filename))
        return jsonify({"status": "success"})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        data = request.json
        img_path = data.get('image')
        if not img_path: return "Missing path", 400
        
        full_path = img_path.lstrip('/')
        if os.path.exists(full_path):
            os.remove(full_path)
            return jsonify({"status": "success"})
        return jsonify({"status": "error", "message": "Fichier introuvable"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    try:
        config = load_config().get('welcome', {})
        chan_id = config.get('channel')
        if not chan_id: return jsonify({"status": "error", "message": "Pas de salon"}), 400

        channel = bot.get_channel(int(chan_id))
        if not channel: return jsonify({"status": "error", "message": "Salon introuvable"}), 404

        embed = discord.Embed(
            title=config.get('title', 'Bienvenue').replace("{user}", bot.user.name), 
            description=config.get('desc', '').replace("{user}", bot.user.mention), 
            color=0xed4245
        )
        
        base_url = f"http://{request.host}" 
        if config.get('thumb'): embed.set_thumbnail(url=f"{base_url}{config['thumb']}")
        if config.get('banner'): embed.set_image(url=f"{base_url}{config['banner']}")
        
        embed.set_footer(text=config.get('footer', 'BagBot'))
        if config.get('footer_icon'): embed.set_footer(text=config.get('footer'), icon_url=f"{base_url}{config['footer_icon']}")
        
        bot.loop.create_task(channel.send(embed=embed))
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur test: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- SERVEUR DE FICHIERS ---
@app.route('/')
def serve_index(): return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_static(path): return send_from_directory('public', path)

def run_flask():
    app.run(host='0.0.0.0', port=49501, debug=False, threaded=True)

if __name__ == '__main__':
    threading.Thread(target=run_flask).start()
    bot.run("TON_TOKEN_ICI")
    
