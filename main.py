import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory
import threading
import json
import os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")

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

intents = discord.Intents.default()
intents.members = True 
intents.guilds = True
bot = commands.Bot(command_prefix="!", intents=intents)

@app.route('/api/get_server_info', methods=['GET'])
def get_server_info():
    config = load_config()
    if not bot.is_ready() or not bot.guilds:
        return jsonify({"status": "loading", "config": config})
    
    try:
        guild = bot.guilds[0]
        # On récupère TOUS les salons et TOUS les rôles
        channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
        roles = [r.name for r in guild.roles if r.name != "@everyone"]
        
        return jsonify({
            "status": "success",
            "channels": channels,
            "all_roles": roles,
            "config": config
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/save_config', methods=['POST'])
def save_config():
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "success"})

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    config = load_config().get('welcome', {})
    channel = bot.get_channel(int(config.get('channel')))
    if channel:
        embed = discord.Embed(title="Test", description="Config opérationnelle", color=0xed4245)
        bot.loop.create_task(channel.send(embed=embed))
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 400

# Routes pour les images et le serveur statique
@app.route('/api/images')
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/public/uploads/{f}" for f in files]})

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files['file']
    file.save(os.path.join(UPLOAD_FOLDER, file.filename))
    return jsonify({"status": "success"})

@app.route('/')
def index(): return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path): return send_from_directory('public', path)

def run_flask():
    app.run(host='0.0.0.0', port=49501, debug=False, use_reloader=False)

if __name__ == '__main__':
    threading.Thread(target=run_flask, daemon=True).start()
    bot.run(TOKEN)
    
