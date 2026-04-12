import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory
import threading
import json
import os

# --- CONFIGURATION INITIALE ---
app = Flask(__name__)
# On s'assure que le dossier des images existe
UPLOAD_FOLDER = 'public/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

CONFIG_FILE = 'config.json'

# Fonction pour charger la config
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"welcome": {}, "admin_roles": []}

# --- PARTIE BOT DISCORD ---
intents = discord.Intents.default()
intents.members = True  # Crucial pour la bienvenue
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot connecté en tant que {bot.user}")

# --- ROUTES API POUR LE PANEL ---

# 1. Récupérer les infos (Salons, Rôles, Config)
@app.route('/api/get_server_info', methods=['GET'])
def get_server_info():
    config = load_config()
    # On récupère les données du premier serveur où se trouve le bot
    if not bot.guilds:
        return jsonify({"channels": [], "all_roles": [], "config": config})
    
    guild = bot.guilds[0]
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    
    return jsonify({
        "channels": channels,
        "all_roles": roles,
        "config": config
    })

# 2. Sauvegarder la configuration (Bienvenue + Admin)
@app.route('/api/save_config', methods=['POST'])
def save_config():
    try:
        new_config = request.json
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(new_config, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 3. Gérer la Galerie (Liste des images)
@app.route('/api/images', methods=['GET'])
def list_images():
    imgs = [f"/public/uploads/{file}" for file in os.listdir(UPLOAD_FOLDER) 
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    return jsonify({"images": imgs})

# 4. Suppression réelle d'une image
@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        data = request.json
        img_path = data.get('image') # Le HTML envoie "/public/uploads/nom.jpg"
        
        # Nettoyage du chemin pour correspondre au système de fichiers
        if img_path.startswith('/'):
            img_path = img_path[1:]
        
        if os.path.exists(img_path):
            os.remove(img_path)
            return jsonify({"status": "success"})
        else:
            return jsonify({"status": "error", "message": "Fichier introuvable"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 5. Upload d'image
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return "No file", 400
    file = request.files['file']
    if file:
        file.save(os.path.join(UPLOAD_FOLDER, file.filename))
        return jsonify({"status": "success"})

# 6. BOUTON TEST : Envoi du message sur Discord
@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    config = load_config().get('welcome', {})
    channel_id = config.get('channel')
    
    if not channel_id:
        return jsonify({"status": "error", "message": "Aucun salon configuré"}), 400

    channel = bot.get_channel(int(channel_id))
    if not channel:
        return jsonify({"status": "error", "message": "Salon introuvable"}), 404

    # Construction de l'Embed
    embed = discord.Embed(
        title=config.get('title', 'Bienvenue !').replace("{user}", bot.user.name),
        description=config.get('desc', 'Content de vous voir.').replace("{user}", bot.user.mention),
        color=0xed4245
    )
    
    # Gestion des images (Thumb, Banner, Footer Icon)
    # On vérifie si c'est une URL ou un chemin local
    def get_url(path):
        if not path: return None
        return path if path.startswith('http') else f"http://ton-ip-ou-domaine:5000{path}"

    if config.get('thumb'): embed.set_thumbnail(url=get_url(config['thumb']))
    if config.get('banner'): embed.set_image(url=get_url(config['banner']))
    
    footer_text = config.get('footer', 'BagBot Ultimate')
    footer_icon = get_url(config.get('footer_icon'))
    embed.set_footer(text=footer_text, icon_url=footer_icon)

    # Envoi via le thread du bot
    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "success"})

# Serveur des fichiers statiques (pour voir les images dans le panel)
@app.route('/public/uploads/<path:filename>')
def custom_static(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

# --- LANCEMENT ---
def run_flask():
    app.run(host='0.0.0.0', port=5000)

if __name__ == '__main__':
    # On lance Flask dans un thread séparé pour ne pas bloquer le bot Discord
    t = threading.Thread(target=run_flask)
    t.start()
    
    # Lance le bot (Remplace par ton vrai token)
    bot.run("TON_TOKEN_ICI")
    
