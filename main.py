import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request, session, redirect
from flask_cors import CORS
from flask_session import Session
import threading, os, json, asyncio, requests
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")
SECRET_KEY = os.getenv("SECRET_KEY", "bagbot_v13_full")

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)
app.config.update(SESSION_PERMANENT=True, SESSION_TYPE="filesystem", SECRET_KEY=SECRET_KEY)
Session(app)

UPLOAD_FOLDER = 'public/uploads'
CONFIG_FILE = 'config.json'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except: return {"welcome": {}, "leave": {}, "admin_roles": []}
    return {"welcome": {}, "leave": {}, "admin_roles": []}

def save_config(data):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

async def send_event_embed(member, event_type):
    config = load_config().get(event_type, {})
    chan_id = config.get("channel")
    if not chan_id: return
    channel = member.guild.get_channel(int(chan_id))
    if not channel: return

    def rep(t):
        if not t: return ""
        return t.replace("{user}", member.mention).replace("{user_name}", member.name).replace("{server}", member.guild.name).replace("{count}", str(member.guild.member_count))

    color = 0xed4245 if event_type == "welcome" else 0x2b2d31
    embed = discord.Embed(title=rep(config.get('title')), description=rep(config.get('desc')), color=color)
    
    files = []
    # Gestion Thumbnail
    if config.get('thumb'):
        t_name = config['thumb'].split('/')[-1]
        t_path = os.path.join(UPLOAD_FOLDER, t_name)
        if os.path.exists(t_path):
            files.append(discord.File(t_path, filename=t_name))
            embed.set_thumbnail(url=f"attachment://{t_name}")

    # Gestion Banner
    if config.get('banner'):
        b_name = config['banner'].split('/')[-1]
        b_path = os.path.join(UPLOAD_FOLDER, b_name)
        if os.path.exists(b_path):
            files.append(discord.File(b_path, filename=b_name))
            embed.set_image(url=f"attachment://{b_name}")

    await channel.send(embed=embed, files=files if files else None)

@bot.event
async def on_member_update(before, after):
    # Déclenchement sur ajout de rôle (Bienvenue facultative)
    config = load_config().get("welcome", {})
    trigger_roles = config.get("trigger_roles", [])
    if trigger_roles:
        for r_name in trigger_roles:
            role = discord.utils.get(after.roles, name=r_name)
            if role and not discord.utils.get(before.roles, name=r_name):
                await send_event_embed(after, "welcome")

@bot.event
async def on_member_join(member):
    # Si pas de rôles déclencheurs, on envoie direct
    if not load_config().get("welcome", {}).get("trigger_roles"):
        await send_event_embed(member, "welcome")

@bot.event
async def on_member_remove(member):
    await send_event_embed(member, "leave")

# --- ROUTES API ---
@app.route('/')
def index():
    if not session.get('admin'): return redirect('/login')
    return send_from_directory('public', 'index.html')

@app.route('/login')
def login():
    url = f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify+guilds.members.read"
    return redirect(url)

@app.route('/login/callback')
def callback():
    code = request.args.get('code')
    data = {'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, 'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI}
    r = requests.post('https://discord.com/api/oauth2/token', data=data)
    token = r.json().get('access_token')
    res = requests.get(f'https://discord.com/api/users/@me/guilds/{GUILD_ID}/member', headers={'Authorization': f'Bearer {token}'})
    if res.status_code == 200:
        session['admin'] = True
        return redirect('/')
    return "Refusé", 403

@app.route('/api/get_server_info')
def get_info():
    guild = bot.get_guild(int(GUILD_ID))
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "all_roles": sorted([r.name for r in guild.roles if r.name != "@everyone"]),
        "config": load_config()
    })

@app.route('/api/save_config', methods=['POST'])
def save_cfg():
    save_config(request.json)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    return jsonify({"url": f"/uploads/{filename}"})

@app.route('/api/images')
def list_images():
    return jsonify({"images": [f"/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER)]})

def run_flask(): app.run(host='0.0.0.0', port=49501)
if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
