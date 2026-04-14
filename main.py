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
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def load_config():
    if not os.path.exists('config.json'):
        return {
            "welcome": {"title": "Bienvenue {user}", "desc": "Bienvenue sur {server}", "footer": "BagBot", "color": "#ed4245", "channel": "", "banner": "", "thumbnail": "", "footer_icon": "", "trigger_roles": []},
            "leave": {"title": "Au revoir", "desc": "{user} est parti", "footer": "BagBot", "color": "#ed4245", "channel": "", "banner": "", "thumbnail": "", "footer_icon": ""},
            "admin_roles": []
        }
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)

async def create_embed_gen(member, conf, mode_name):
    title = str(conf.get('title', ' ')).replace("{user}", member.display_name).replace("{server}", member.guild.name).replace("{count}", str(member.guild.member_count))
    desc = str(conf.get('desc', ' ')).replace("{user}", member.mention).replace("{server}", member.guild.name).replace("{count}", str(member.guild.member_count))
    col_hex = str(conf.get('color', '#ed4245')).replace('#', '')
    try: col = int(col_hex, 16)
    except: col = 0xed4245
    
    embed = discord.Embed(title=title, description=desc, color=col)
    files = []

    async def process_img(path, sub_mode):
        if not path or path.strip() == "": return
        if path.startswith('/uploads'):
            fname = path.split('/')[-1]
            fpath = os.path.join('public', 'uploads', fname)
            if os.path.exists(fpath):
                att_name = f"{mode_name}_{sub_mode}_{fname}"
                files.append(discord.File(fpath, filename=att_name))
                if sub_mode == "banner": embed.set_image(url=f"attachment://{att_name}")
                elif sub_mode == "thumb": embed.set_thumbnail(url=f"attachment://{att_name}")
                elif sub_mode == "footer": embed.set_footer(text=conf.get('footer', ' '), icon_url=f"attachment://{att_name}")
        else:
            if sub_mode == "banner": embed.set_image(url=path)
            elif sub_mode == "thumb": embed.set_thumbnail(url=path)
            elif sub_mode == "footer": embed.set_footer(text=conf.get('footer', ' '), icon_url=path)

    await asyncio.gather(
        process_img(conf.get('banner'), "banner"), 
        process_img(conf.get('thumbnail'), "thumb"), 
        process_img(conf.get('footer_icon'), "footer")
    )
    if not embed.footer.text: embed.set_footer(text=conf.get('footer', ' '))
    return embed, files

@bot.event
async def on_member_join(member):
    if member.guild.id != GUILD_ID: return
    conf = load_config().get("welcome")
    if not conf or not conf.get("channel"): return
    channel = bot.get_channel(int(conf.get("channel")))
    if channel:
        embed, files = await create_embed_gen(member, conf, "welcome")
        await channel.send(content=f"👋 {member.mention}", embed=embed, files=files)
        roles_to_add = [discord.utils.get(member.guild.roles, name=r) for r in conf.get("trigger_roles", [])]
        await member.add_roles(*[r for r in roles_to_add if r])

@app.route('/')
def index(): return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    guild = bot.get_guild(GUILD_ID)
    if not guild: return jsonify({"error": "Guild non trouvée"}), 404
    images = [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    roles = [r.name for r in guild.roles if not r.managed and r.name != "@everyone"]
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": roles,
        "config": load_config(),
        "images": images
    })

@app.route('/api/save', methods=['POST'])
def save():
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "ok"})

@app.route('/api/test_embed', methods=['POST'])
def test_embed():
    data = request.json
    mode = data.get('mode', 'welcome')
    conf = load_config().get(mode)
    channel = bot.get_channel(int(conf.get("channel")))
    if channel:
        guild = bot.get_guild(GUILD_ID)
        member = guild.owner
        future = asyncio.run_coroutine_threadsafe(create_embed_gen(member, conf, mode), bot.loop)
        embed, files = future.result()
        asyncio.run_coroutine_threadsafe(channel.send(content=f"🧪 **TEST {mode.upper()}**\n{member.mention}", embed=embed, files=files), bot.loop)
        return jsonify({"status": "sent"})
    return jsonify({"error": "Erreur"}), 400

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files.get('file')
    if file:
        fname = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER, fname))
        return jsonify({"path": f"/uploads/{fname}"})
    return jsonify({"error": "No file"}), 400

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    path = request.json.get('path', '').lstrip('/')
    full_path = os.path.join('public', path)
    if os.path.exists(full_path):
        os.remove(full_path)
        return jsonify({"status": "deleted"})
    return jsonify({"error": "File not found"}), 404

def run(): app.run(host='0.0.0.0', port=49501)
threading.Thread(target=run, daemon=True).start()
bot.run(TOKEN)
        
