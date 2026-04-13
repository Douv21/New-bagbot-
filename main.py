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
        if not chan: return jsonify({"error": "Salon introuvable"}), 400
        
        guild = bot.get_guild(GUILD_ID)
        title = conf.get('title').replace("{user}", "TestUser").replace("{server}", guild.name).replace("{count}", str(guild.member_count))
        desc = conf.get('desc').replace("{user}", "TestUser").replace("{server}", guild.name).replace("{count}", str(guild.member_count))
        
        col = int(conf.get('color').replace('#', ''), 16)
        embed = discord.Embed(title=title, description=desc, color=col)
        
        files_to_send = []

        # Fonction pour attacher une image locale si nécessaire
        def process_image(img_path, embed_type):
            if not img_path: return
            if img_path.startswith('/uploads'):
                filename = img_path.split('/')[-1]
                full_path = os.path.join('public', img_path.lstrip('/'))
                if os.path.exists(full_path):
                    d_file = discord.File(full_path, filename=filename)
                    files_to_send.append(d_file)
                    if embed_type == "banner": embed.set_image(url=f"attachment://{filename}")
                    if embed_type == "thumb": embed.set_thumbnail(url=f"attachment://{filename}")
                    if embed_type == "footer": embed.set_footer(text=conf.get('footer'), icon_url=f"attachment://{filename}")
            else:
                # Si c'est une URL externe (http...)
                if embed_type == "banner": embed.set_image(url=img_path)
                if embed_type == "thumb": embed.set_thumbnail(url=img_path)
                if embed_type == "footer": embed.set_footer(text=conf.get('footer'), icon_url=img_path)

        process_image(conf.get('banner'), "banner")
        process_image(conf.get('thumbnail'), "thumb")
        process_image(conf.get('footer_icon'), "footer")
        
        if not embed.footer.text:
            embed.set_footer(text=conf.get('footer'))

        bot.loop.create_task(chan.send(content="**[TEST ELITE V9 - FIX IMAGES]**", embed=embed, files=files_to_send))
        return jsonify({"status": "sent"})
    except Exception as e:
        print(f"Erreur Test: {e}")
        return jsonify({"error": str(e)}), 500

def run(): app.run(host='0.0.0.0', port=49501)
threading.Thread(target=run, daemon=True).start()
bot.run(TOKEN)
