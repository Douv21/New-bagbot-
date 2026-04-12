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
            try: return json.load(f)
            except: return {"welcome": {}}
    return {"welcome": {}}

intents = discord.Intents.default()
intents.members = True 
intents.guilds = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@app.route('/api/get_server_info', methods=['GET'])
def get_server_info():
    config = load_config()
    if not bot.is_ready() or not bot.guilds:
        return jsonify({"status": "loading", "config": config})
    guild = bot.guilds[0]
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    return jsonify({"status": "success", "channels": channels, "all_roles": roles, "config": config})

@app.route('/api/save_config', methods=['POST'])
def save_config():
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "success"})

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    config = load_config().get('welcome', {})
    channel_id = config.get('channel')
    if not channel_id: return jsonify({"status": "error"}), 400
    channel = bot.get_channel(int(channel_id))
    guild = bot.guilds[0]
    
    def parse_vars(t):
        if not t: return ""
        return t.replace("{user}", bot.user.name).replace("{server}", guild.name).replace("{count}", str(guild.member_count))

    embed = discord.Embed(title=parse_vars(config.get('title')), description=parse_vars(config.get('desc')), color=0xed4245)
    base_url = f"http://{request.host}"
    
    if config.get('thumb'):
        embed.set_thumbnail(url=config['thumb'] if config['thumb'].startswith('http') else f"{base_url}{config['thumb']}")
    if config.get('banner'):
        embed.set_image(url=config['banner'] if config['banner'].startswith('http') else f"{base_url}{config['banner']}")
    
    footer_text = parse_vars(config.get('footer', 'BagBot'))
    if config.get('footer_icon'):
        f_url = config['footer_icon'] if config['footer_icon'].startswith('http') else f"{base_url}{config['footer_icon']}"
        embed.set_footer(text=footer_text, icon_url=f_url)
    else:
        embed.set_footer(text=footer_text)

    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "success"})

@app.route('/api/images')
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/public/uploads/{f}" for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]})

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files['file']
    filename = file.filename.replace(" ", "_")
    path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(path)
    return jsonify({"status": "success", "path": f"/public/uploads/{filename}"})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    img_path = request.json.get('image', '').lstrip('/')
    if os.path.exists(img_path):
        os.remove(img_path)
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 404

@app.route('/')
def index(): return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path): return send_from_directory('public', path)

if __name__ == '__main__':
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501), daemon=True).start()
    bot.run(TOKEN)
    
