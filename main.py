import os
import json
import discord
import threading
import asyncio
from discord.ext import commands
from flask import Flask, session, request, jsonify, redirect
from dotenv import load_dotenv

# --- INITIALISATION ---
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID_STR = os.getenv("GUILD_ID")
REDIRECT_URI = os.getenv("REDIRECT_URI")

try:
    GUILD_ID = int(GUILD_ID_STR) if GUILD_ID_STR else 0
except ValueError:
    GUILD_ID = 0

app = Flask(__name__, static_folder='public', static_url_path='/')
app.secret_key = os.urandom(24)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- GESTION CONFIGURATION ---
def load_config():
    default_cfg = {
        "welcome": {
            "title": "Bienvenue {user} !",
            "desc": "Content de te voir sur {guild}.",
            "footer": "Nous sommes désormais {count}",
            "footer_icon": "",
            "color": "#ed4245",
            "channel": "",
            "banner": "",
            "thumbnail": "",
            "trigger_roles": ["@JOIN"]
        },
        "admin_roles": []
    }
    if not os.path.exists('config.json'):
        return default_cfg
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Migration/Vérification des nouvelles clés (color, footer_icon)
            if "welcome" not in data: data["welcome"] = default_cfg["welcome"]
            for key in default_cfg["welcome"]:
                if key not in data["welcome"]:
                    data["welcome"][key] = default_cfg["welcome"][key]
            return data
    except Exception:
        return default_cfg

# --- ROUTES API ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return jsonify({"error": "Serveur introuvable"}), 404

    img_dir = 'public/uploads'
    if not os.path.exists(img_dir): os.makedirs(img_dir)
    images = [f"/uploads/{f}" for f in os.listdir(img_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]

    roles_list = ["@JOIN"] + [r.name for r in guild.roles if not r.managed and r.name != "@everyone"]

    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": roles_list,
        "config": load_config(),
        "images": images,
        "guild_name": guild.name
    })

@app.route('/api/save', methods=['POST'])
def save():
    try:
        new_data = request.json
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(new_data, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        img_path = request.json.get('path')
        full_path = os.path.join('public', img_path.lstrip('/'))
        if os.path.exists(full_path) and "/uploads/" in img_path:
            os.remove(full_path)
            return jsonify({"status": "deleted"})
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/test_message', methods=['POST'])
def test_message():
    # Fonction pour envoyer un message test réel via le bot
    config = request.json.get('welcome')
    channel_id = config.get('channel')
    if not channel_id: return jsonify({"error": "Aucun salon sélectionné"}), 400
    
    channel = bot.get_channel(int(channel_id))
    if not channel: return jsonify({"error": "Salon introuvable"}), 404

    # Simulation d'embed
    color = int(config.get('color', '#ed4245').replace('#', ''), 16)
    embed = discord.Embed(title=config.get('title'), description=config.get('desc'), color=color)
    if config.get('banner'): embed.set_image(url=config.get('banner'))
    if config.get('thumbnail'): embed.set_thumbnail(url=config.get('thumbnail'))
    embed.set_footer(text=config.get('footer'), icon_url=config.get('footer_icon'))
    
    bot.loop.create_task(channel.send(content="✨ **Test du message de bienvenue**", embed=embed))
    return jsonify({"status": "sent"})

def run_flask():
    app.run(host='0.0.0.0', port=49501, use_reloader=False)

if __name__ == "__main__":
    t = threading.Thread(target=run_flask)
    t.daemon = True
    t.start()
    bot.run(TOKEN)
            
