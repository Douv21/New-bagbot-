import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
import threading, os, json
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# --- CONFIGURATION INITIALE ---
load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__, static_folder='public', static_url_path='')
UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- GESTION DE LA CONFIGURATION (JSON) ---
CONFIG_FILE = 'config.json'

def save_config(data):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# --- ROUTES FLASK (WEB) ---

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/api/get_server_info')
def get_info():
    try:
        guild = bot.get_guild(int(GUILD_ID))
        if not guild:
            return jsonify({"error": "Serveur non trouvé"}), 404
        
        channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
        bot_info = {
            "name": bot.user.name,
            "avatar": str(bot.user.display_avatar.url)
        }
        return jsonify({
            "channels": channels, 
            "bot": bot_info, 
            "config": load_config()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save_config', methods=['POST'])
def api_save():
    data = request.json
    save_config(data)
    return jsonify({"status": "success"})

@app.route('/api/test_message', methods=['POST'])
async def test_message():
    data = request.json
    try:
        channel_id = data.get('channel')
        if not channel_id:
            return jsonify({"error": "Aucun salon sélectionné"}), 400

        channel = bot.get_channel(int(channel_id))
        if not channel:
            return jsonify({"error": "Salon introuvable"}), 404

        # Remplacement des variables pour le test réel sur Discord
        title = data.get('title', '').replace("{user}", bot.user.name)
        
        # Simulation des variables dans la description
        desc = data.get('desc', '')
        desc = desc.replace("{user}", bot.user.mention)
        desc = desc.replace("{server}", channel.guild.name)
        desc = desc.replace("{count}", str(channel.guild.member_count))

        embed = discord.Embed(
            title=title, 
            description=desc, 
            color=0xed4245
        )

        # Vérification et ajout des images
        thumb = data.get('thumb')
        if thumb and thumb.startswith('http'):
            embed.set_thumbnail(url=thumb)
            
        banner = data.get('banner')
        if banner and banner.startswith('http'):
            embed.set_image(url=banner)

        await channel.send(content="🧪 **Test de configuration BagBot**", embed=embed)
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur lors du test: {e}")
        return jsonify({"error": str(e)}), 500

# --- GESTION DES IMAGES ---

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    # On retourne l'URL relative pour le dashboard
    return jsonify({"url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/images/delete', methods=['POST'])
def delete_image():
    data = request.json
    url = data.get('url', '')
    # On extrait le nom du fichier de l'URL (/uploads/monimage.jpg -> monimage.jpg)
    filename = url.split('/')[-1]
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if os.path.exists(path):
        os.remove(path)
        return jsonify({"status": "success"})
    return jsonify({"error": "Fichier non trouvé"}), 404

# --- BOT DISCORD ---

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot connecté en tant que {bot.user.name}")

def run_flask():
    # host='0.0.0.0' permet l'accès depuis ton téléphone sur le réseau local
    app.run(host='0.0.0.0', port=49501, debug=False, use_reloader=False)

if __name__ == "__main__":
    # Lancement de Flask dans un thread séparé
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.start()
    
    # Lancement du Bot
    bot.run(TOKEN)
    
