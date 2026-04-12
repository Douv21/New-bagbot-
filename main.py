import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
import threading, os, json
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__, static_folder='public', static_url_path='')
UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- SAUVEGARDE DES DONNÉES ---
def save_config(data):
    with open('config.json', 'w') as f:
        json.dump(data, f)

def load_config():
    if os.path.exists('config.json'):
        with open('config.json', 'r') as f:
            return json.load(f)
    return {}

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

# --- API : ENREGISTRER & TESTER ---
@app.route('/api/save_config', methods=['POST'])
def api_save():
    data = request.json
    save_config(data)
    return jsonify({"status": "success"})

@app.route('/api/test_message', methods=['POST'])
async def test_message():
    data = request.json
    try:
        channel = bot.get_channel(int(data['channel']))
        desc = data['desc'].replace("{user}", bot.user.mention).replace("{server}", channel.guild.name)
        
        embed = discord.Embed(title=data['title'], description=desc, color=0xed4245)
        if data.get('thumb'): embed.set_thumbnail(url=data['thumb'])
        if data.get('banner'): embed.set_image(url=data['banner'])
        
        await channel.send(content="🧪 **Test BagBot**", embed=embed)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- API : IMAGES (UPLOAD & DELETE) ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/images/delete', methods=['POST'])
def delete_image():
    data = request.json
    # On nettoie l'URL pour avoir le nom du fichier
    filename = data['url'].split('/')[-1]
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(path):
        os.remove(path)
        return jsonify({"status": "success"})
    return jsonify({"error": "Fichier non trouvé"}), 404

@app.route('/api/get_server_info')
def get_info():
    guild = bot.get_guild(int(GUILD_ID))
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    return jsonify({"channels": channels, "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}, "config": load_config()})

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    app.run(host='0.0.0.0', port=49501)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
