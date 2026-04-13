import os
import json
import discord
import threading
from discord.ext import commands
from flask import Flask, request, jsonify, session
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# --- INITIALISATION ---
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID_STR = os.getenv("GUILD_ID")

try:
    GUILD_ID = int(GUILD_ID_STR) if GUILD_ID_STR else 0
except ValueError:
    GUILD_ID = 0

app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)
UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- CONFIG ---
def load_config():
    default_cfg = {
        "welcome": {
            "title": "Bienvenue {user} !", "desc": "Content de te voir.", 
            "footer": "Nous sommes {count}", "footer_icon": "", 
            "color": "#ed4245", "channel": "", "banner": "", 
            "thumbnail": "", "trigger_roles": ["@JOIN"]
        },
        "admin_roles": []
    }
    if not os.path.exists('config.json'): return default_cfg
    try:
        with open('config.json', 'r', encoding='utf-8') as f: return json.load(f)
    except: return default_cfg

# --- ROUTES ---
@app.route('/')
def index(): return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Guild Error"}), 404
    if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    roles = ["@JOIN"] + [r.name for r in guild.roles if not r.managed and r.name != "@everyone"]
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": roles, "config": load_config(), "images": images, "guild_name": guild.name
    })

@app.route('/api/save', methods=['POST'])
def save():
    try:
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(request.json, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No name"}), 400
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"status": "success", "path": f"/uploads/{filename}"})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    img_path = request.json.get('path')
    full_path = os.path.join('public', img_path.lstrip('/'))
    if os.path.exists(full_path):
        os.remove(full_path)
        return jsonify({"status": "deleted"})
    return jsonify({"error": "Not found"}), 404

@app.route('/api/test_message', methods=['POST'])
def test_message():
    config = request.json.get('welcome')
    channel = bot.get_channel(int(config.get('channel')))
    if not channel: return jsonify({"error": "Salon introuvable"}), 404
    color = int(config.get('color', '#ed4245').replace('#', ''), 16)
    embed = discord.Embed(title=config.get('title'), description=config.get('desc'), color=color)
    if config.get('banner'): embed.set_image(url=config.get('banner'))
    if config.get('thumbnail'): embed.set_thumbnail(url=config.get('thumbnail'))
    embed.set_footer(text=config.get('footer'), icon_url=config.get('footer_icon'))
    bot.loop.create_task(channel.send(content="✨ **Test Elite V6**", embed=embed))
    return jsonify({"status": "sent"})

def run_flask(): app.run(host='0.0.0.0', port=49501, use_reloader=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask, daemon=True).start()
    bot.run(TOKEN)
    
