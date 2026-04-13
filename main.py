import os
import json
import discord
import threading
import asyncio
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
                "channel": "", "banner": "", "thumbnail": "", "trigger_roles": []
            },
            "admin_roles": []
        }

@bot.event
async def on_member_join(member):
    if member.guild.id != GUILD_ID: return
    conf = load_config().get("welcome")
    if not conf or not conf.get("channel"): return
    
    channel = bot.get_channel(int(conf.get("channel")))
    if not channel: return

    # Préparation du contenu
    title = conf.get('title').replace("{user}", member.display_name).replace("{server}", member.guild.name).replace("{count}", str(member.guild.member_count))
    desc = conf.get('desc').replace("{user}", member.mention).replace("{server}", member.guild.name).replace("{count}", str(member.guild.member_count))
    col = int(conf.get('color').replace('#', ''), 16)
    
    embed = discord.Embed(title=title, description=desc, color=col)
    files = []

    # Traitement des images
    def get_img(p, target):
        if not p: return
        if p.startswith('/uploads'):
            fname = p.split('/')[-1]
            fpath = os.path.join('public', 'uploads', fname)
            if os.path.exists(fpath):
                files.append(discord.File(fpath, filename=fname))
                if target == "banner": embed.set_image(url=f"attachment://{fname}")
                if target == "thumb": embed.set_thumbnail(url=f"attachment://{fname}")
                if target == "footer": embed.set_footer(text=conf.get('footer'), icon_url=f"attachment://{fname}")
        else:
            if target == "banner": embed.set_image(url=p)
            if target == "thumb": embed.set_thumbnail(url=p)
            if target == "footer": embed.set_footer(text=conf.get('footer'), icon_url=p)

    get_img(conf.get('banner'), "banner")
    get_img(conf.get('thumbnail'), "thumb")
    get_img(conf.get('footer_icon'), "footer")
    if not embed.footer.text: embed.set_footer(text=conf.get('footer'))

    # Envoi avec mention (ping) du membre
    await channel.send(content=f"Bienvenue {member.mention} !", embed=embed, files=files)

@app.route('/')
def index(): return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Guild non trouvée"}), 404
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    roles = [r.name for r in guild.roles if not r.managed and r.name != "@everyone" and r.name != "@JOIN"]
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": roles, "config": load_config(), "images": images,
        "server_info": {"name": guild.name, "member_count": guild.member_count, "bot_name": bot.user.name}
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
    async def send_test():
        try:
            chan = bot.get_channel(int(conf.get('channel')))
            guild = bot.get_guild(GUILD_ID)
            title = conf.get('title').replace("{user}", "TestUser").replace("{server}", guild.name).replace("{count}", str(guild.member_count))
            desc = conf.get('desc').replace("{user}", "@TestUser").replace("{server}", guild.name).replace("{count}", str(guild.member_count))
            col = int(conf.get('color').replace('#', ''), 16)
            embed = discord.Embed(title=title, description=desc, color=col)
            files = []
            
            def handle_img(path, type):
                if not path: return
                if path.startswith('/uploads'):
                    fname = path.split('/')[-1]
                    fpath = os.path.join('public', 'uploads', fname)
                    if os.path.exists(fpath):
                        files.append(discord.File(fpath, filename=fname))
                        if type == "banner": embed.set_image(url=f"attachment://{fname}")
                        if type == "thumb": embed.set_thumbnail(url=f"attachment://{fname}")
                        if type == "footer": embed.set_footer(text=conf.get('footer'), icon_url=f"attachment://{fname}")
                else:
                    if type == "banner": embed.set_image(url=path)
                    if type == "thumb": embed.set_thumbnail(url=path)
                    if type == "footer": embed.set_footer(text=conf.get('footer'), icon_url=path)

            handle_img(conf.get('banner'), "banner")
            handle_img(conf.get('thumbnail'), "thumb")
            handle_img(conf.get('footer_icon'), "footer")
            if not embed.footer.text: embed.set_footer(text=conf.get('footer'))
            
            await chan.send(content="**[PING]** @TestUser\n**[TEST RAPIDE ELITE]**", embed=embed, files=files)
        except Exception as e: print(f"Error: {e}")

    bot.loop.create_task(send_test())
    return jsonify({"status": "sent"})

def run(): app.run(host='0.0.0.0', port=49501)
threading.Thread(target=run, daemon=True).start()
bot.run(TOKEN)
