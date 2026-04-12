import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request, session, redirect, url_for
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
SECRET_KEY = os.getenv("SECRET_KEY", "bagbot_full_v4")
OWNER_ID = "943487722738311219"

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
            except: return {}
    return {}

def save_config(data):
    current = load_config()
    current.update(data)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(current, f, indent=4, ensure_ascii=False)

# --- BOT LOGIC ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

async def send_welcome_embed(member, config, is_test=False):
    try:
        chan_id = config.get("target_channel") or config.get("channel")
        if not chan_id: return "ERREUR: Salon non configuré."
        channel = member.guild.get_channel(int(chan_id))
        if not channel: return "ERREUR: Salon introuvable."

        def rep(t):
            if not t: return ""
            return t.replace("{user}", member.mention).replace("{server}", member.guild.name).replace("{count}", str(member.guild.member_count))

        embed = discord.Embed(title=rep(config.get('title', 'Bienvenue')), description=rep(config.get('desc', '')), color=0xed4245)
        
        file_to_send = None
        for key in ['thumb', 'banner']:
            val = config.get(key)
            if val:
                if val.startswith('/uploads/'):
                    fname = val.split('/')[-1]
                    fpath = os.path.join(UPLOAD_FOLDER, fname)
                    if os.path.exists(fpath):
                        file_to_send = discord.File(fpath, filename=fname)
                        if key == 'thumb': embed.set_thumbnail(url=f"attachment://{fname}")
                        else: embed.set_image(url=f"attachment://{fname}")
                else:
                    if key == 'thumb': embed.set_thumbnail(url=val)
                    else: embed.set_image(url=val)

        content = f"{'🚀 **TEST**' if is_test else ''}\n{member.mention}"
        await channel.send(content=content, embed=embed, file=file_to_send if file_to_send else None)
        return "SUCCÈS"
    except Exception as e: return f"ERREUR: {str(e)}"

@bot.event
async def on_member_join(member):
    config = load_config()
    if not config.get("trigger_roles"): await send_welcome_embed(member, config)

@bot.event
async def on_member_update(before, after):
    config = load_config()
    triggers = config.get("trigger_roles", [])
    if triggers and len(before.roles) < len(after.roles):
        new_role = next(role for role in after.roles if role not in before.roles)
        if new_role.name in triggers: await send_welcome_embed(after, config)

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
        m = res.json()
        session['admin'] = True
        session['user_id'] = str(m['user']['id'])
        session['user_name'] = m['user']['username']
        session['user_roles'] = [r for r in m.get('roles', [])]
        return redirect('/')
    return "Refusé", 403

@app.route('/api/get_server_info')
def get_info():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    guild = bot.get_guild(int(GUILD_ID))
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "all_roles": sorted([r.name for r in guild.roles if r.name != "@everyone"]),
        "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)},
        "config": load_config(),
        "is_owner": str(session.get('user_id')) == OWNER_ID,
        "user_connected": session.get('user_name', 'User'),
        "server_name": guild.name,
        "member_count": guild.member_count
    })

@app.route('/api/test_message', methods=['POST'])
def test_msg():
    data = request.json
    guild = bot.get_guild(int(GUILD_ID))
    member = guild.get_member(int(session['user_id'])) or bot.user
    fut = asyncio.run_coroutine_threadsafe(send_welcome_embed(member, data, True), bot.loop)
    return jsonify({"status": fut.result()})

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
    
