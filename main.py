import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS  # Optionnel : aide pour l'accès distant
import threading, os, json
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app) # Autorise les requêtes de l'extérieur
UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

CONFIG_FILE = 'config.json'

def save_config(data):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/api/get_server_info')
def get_info():
    try:
        guild = bot.get_guild(int(GUILD_ID))
        if not guild: return jsonify({"error": "Serveur non trouvé"}), 404
        
        # On s'assure de récupérer tous les salons textuels
        channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
        return jsonify({
            "channels": channels, 
            "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}, 
            "config": load_config()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/test_message', methods=['POST'])
async def test_message():
    data = request.json
    try:
        channel_id = data.get('channel')
        channel = bot.get_channel(int(channel_id))
        
        # Ré-insertion des variables disparues
        title = data.get('title', '').replace("{user}", bot.user.name)
        desc = data.get('desc', '')
        desc = desc.replace("{user}", bot.user.mention)
        desc = desc.replace("{server}", channel.guild.name)
        desc = desc.replace("{count}", str(channel.guild.member_count))

        embed = discord.Embed(title=title, description=desc, color=0xed4245)
        if data.get('thumb'): embed.set_thumbnail(url=data['thumb'])
        if data.get('banner'): embed.set_image(url=data['banner'])
            
        await channel.send(content="🧪 **Test BagBot**", embed=embed)
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur Test: {e}")
        return jsonify({"error": str(e)}), 500

# ... (Gardez les routes api/upload et api/images/delete identiques au précédent)

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
    filename = data['url'].split('/')[-1]
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(path):
        os.remove(path)
        return jsonify({"status": "success"})
    return jsonify({"error": "404"}), 404

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    # host='0.0.0.0' est CRUCIAL pour l'accès à distance
    app.run(host='0.0.0.0', port=49501, debug=False, use_reloader=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
