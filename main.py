import os
import json
import discord
import threading
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
    try:
        with open('config.json', 'r', encoding='utf-8') as f: return json.load(f)
    except:
        return {
            "welcome": {
                "title": "Bienvenue {user}", "desc": "Bienvenue sur {server}", 
                "footer": "Jormungand21", "footer_icon": "", "color": "#ed4245", 
                "channel": "", "banner": "", "thumbnail": "", "trigger_roles": ["@JOIN"]
            },
            "admin_roles": []
        }

@app.route('/')
def index(): return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Guild non trouvée"}), 404
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    roles = ["@JOIN"] + [r.name for r in guild.roles if not r.managed and r.name != "@everyone"]
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": roles, "config": load_config(), "images": images,
        "server_info": {"name": guild.name, "member_count": guild.member_count}
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

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    path = request.json.get('path')
    full = os.path.join('public', path.lstrip('/'))
    if os.path.exists(full): os.remove(full)
    return jsonify({"status": "deleted"})

@app.route('/api/test_message', methods=['POST'])
def test():
    conf = request.json.get('welcome')
    try:
        channel_id = int(conf.get('channel'))
        chan = bot.get_channel(channel_id)
        if not chan: 
            return jsonify({"error": f"Salon {channel_id} introuvable"}), 400
        
        guild = bot.get_guild(GUILD_ID)
        title = conf.get('title').replace("{user}", "TestUser").replace("{server}", guild.name).replace("{count}", str(guild.member_count))
        desc = conf.get('desc').replace("{user}", "TestUser").replace("{server}", guild.name).replace("{count}", str(guild.member_count))
        
        col = int(conf.get('color').replace('#', ''), 16)
        embed = discord.Embed(title=title, description=desc, color=col)
        
        # CORRECTIF CRITIQUE : Conversion des chemins locaux en URLs publiques
        def fix_url(u):
            if not u: return None
            if u.startswith('/uploads'): 
                # On utilise l'IP/Host de la requête pour que Discord trouve l'image
                return f"http://{request.host}{u}"
            return u

        banner_url = fix_url(conf.get('banner'))
        thumb_url = fix_url(conf.get('thumbnail'))
        f_icon_url = fix_url(conf.get('footer_icon'))

        if banner_url: embed.set_image(url=banner_url)
        if thumb_url: embed.set_thumbnail(url=thumb_url)
        embed.set_footer(text=conf.get('footer'), icon_url=f_icon_url)
        
        bot.loop.create_task(chan.send(content="**[TEST ELITE V9]**", embed=embed))
        return jsonify({"status": "sent"})
    except Exception as e:
        print(f"Erreur Test: {e}")
        return jsonify({"error": str(e)}), 500

def run(): app.run(host='0.0.0.0', port=49501)
threading.Thread(target=run, daemon=True).start()
bot.run(TOKEN)
