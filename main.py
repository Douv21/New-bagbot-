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

@app.route('/api/test_message', methods=['POST'])
def test_message():
    data = request.json
    try:
        channel_id = data.get('channel')
        
        async def send_task():
            channel = bot.get_channel(int(channel_id))
            if not channel: return

            def rep(text):
                return text.replace("{user}", bot.user.mention)\
                           .replace("{server}", channel.guild.name)\
                           .replace("{count}", str(channel.guild.member_count))\
                           .replace("{channel}", channel.mention)\
                           .replace("{everyone}", "@everyone")\
                           .replace("{here}", "@here")

            embed = discord.Embed(title=rep(data.get('title', '')), description=rep(data.get('desc', '')), color=0xed4245)
            
            files_to_send = []
            
            # Traitement de la miniature (Thumb)
            thumb_val = data.get('thumb')
            if thumb_val:
                if thumb_val.startswith('/uploads/'):
                    fname = thumb_val.split('/')[-1]
                    fpath = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                    if os.path.exists(fpath):
                        files_to_send.append(discord.File(fpath, filename=fname))
                        embed.set_thumbnail(url=f"attachment://{fname}")
                else:
                    embed.set_thumbnail(url=thumb_val)

            # Traitement de la bannière (Banner)
            banner_val = data.get('banner')
            if banner_val:
                if banner_val.startswith('/uploads/'):
                    fname = banner_val.split('/')[-1]
                    fpath = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                    if os.path.exists(fpath):
                        files_to_send.append(discord.File(fpath, filename=fname))
                        embed.set_image(url=f"attachment://{fname}")
                else:
                    embed.set_image(url=banner_val)

            # L'envoi groupé avec files= évite l'affichage séparé si attachment:// est utilisé
            await channel.send(embed=embed, files=files_to_send)

        asyncio.run_coroutine_threadsafe(send_task(), bot.loop)
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/save_config', methods=['POST'])
def api_save():
    save_config(request.json)
    return jsonify({"status": "success"})

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

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
