import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import threading, os, json, asyncio
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)
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
        channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
        return jsonify({
            "channels": channels, 
            "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}, 
            "config": load_config()
        })
    except:
        return jsonify({"error": "Serveur non prêt"}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    # On sécurise le nom pour éviter les problèmes de caractères dans l'attachment
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    data = request.json
    path = data.get('path', '').replace('/uploads/', '')
    full_path = os.path.join(app.config['UPLOAD_FOLDER'], path)
    if os.path.exists(full_path):
        os.remove(full_path)
        return jsonify({"status": "success"})
    return jsonify({"error": "Fichier introuvable"}), 404

@app.route('/api/test_message', methods=['POST'])
def test_message():
    data = request.json
    try:
        async def send_task():
            channel = bot.get_channel(int(data.get('channel')))
            if not channel: return

            def rep(text):
                return text.replace("{user}", bot.user.mention).replace("{server}", channel.guild.name).replace("{count}", str(channel.guild.member_count)).replace("{channel}", channel.mention).replace("{everyone}", "@everyone").replace("{here}", "@here")

            embed = discord.Embed(title=rep(data.get('title', '')), description=rep(data.get('desc', '')), color=0xed4245)
            files_to_send = []

            # Fonction interne pour traiter les images sans doublons
            def process_img(key, attr_fn):
                val = data.get(key)
                if val and val.startswith('/uploads/'):
                    fname = val.split('/')[-1]
                    fpath = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                    if os.path.exists(fpath):
                        # Pour éviter les doublons, on utilise un nom unique dans l'attachment
                        discord_file = discord.File(fpath, filename=fname)
                        files_to_send.append(discord_file)
                        attr_fn(url=f"attachment://{fname}")
                elif val and val.startswith('http'):
                    attr_fn(url=val)

            process_img('thumb', embed.set_thumbnail)
            process_img('banner', embed.set_image)

            await channel.send(embed=embed, files=files_to_send)

        asyncio.run_coroutine_threadsafe(send_task(), bot.loop)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save_config', methods=['POST'])
def api_save():
    save_config(request.json)
    return jsonify({"status": "success"})

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
