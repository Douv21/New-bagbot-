import os, json, discord, threading, asyncio
from discord.ext import commands
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = int(os.getenv("GUILD_ID", 0))

app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)
UPLOAD_FOLDER = 'public/uploads'
if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def load_config():
    if not os.path.exists('config.json'):
        return {"welcome": {"title": "Bienvenue", "desc": "{user}", "color": "#ed4245", "channel": ""}, "leave": {}, "admin_roles": []}
    with open('config.json', 'r', encoding='utf-8') as f: return json.load(f)

@app.route('/')
def index(): return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        # Retourne des données à vide pour éviter que le JS plante
        return jsonify({"channels": [], "roles": [], "config": load_config(), "images": [], "server_info": {"name": "Bot Déconnecté", "member_count": 0}})
    
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    roles = [r.name for r in guild.roles if not r.managed and r.name != "@everyone"]
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    
    return jsonify({
        "channels": channels, "roles": roles, "config": load_config(), 
        "images": images, "server_info": {"name": guild.name, "member_count": guild.member_count}
    })

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files.get('file')
    if file:
        fname = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER, fname))
        return jsonify({"path": f"/uploads/{fname}"})
    return jsonify({"error": "No file"}), 400

@app.route('/api/save', methods=['POST'])
def save():
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "ok"})

def run(): app.run(host='0.0.0.0', port=49501)
threading.Thread(target=run, daemon=True).start()
bot.run(TOKEN)
