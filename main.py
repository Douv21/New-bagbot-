import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory, session, redirect
import requests, threading, os, json
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID = os.getenv("GUILD_ID")
OWNER_ID = os.getenv("OWNER_ID")
REDIRECT_URI = os.getenv("REDIRECT_URI")

app = Flask(__name__)
app.secret_key = os.urandom(24)
UPLOAD_FOLDER = 'public/uploads'
CONFIG_FILE = 'config.json'

if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except: return {"welcome": {}, "admin_roles": [], "auto_roles": []}
    return {"welcome": {}, "admin_roles": [], "auto_roles": []}

# --- BOT DISCORD ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_member_join(member):
    if str(member.guild.id) != str(GUILD_ID): return
    config = load_config()
    
    # 1. Attribution des rôles automatiques
    auto_roles = config.get('auto_roles', [])
    for role_name in auto_roles:
        role = discord.utils.get(member.guild.roles, name=role_name)
        if role: await member.add_roles(role)

    # 2. Envoi du message de bienvenue
    w = config.get('welcome', {})
    channel = bot.get_channel(int(w.get('channel')))
    if channel:
        title = w.get('title', '').replace('{user}', member.name)
        desc = w.get('desc', '').replace('{user}', member.mention)
        embed = discord.Embed(title=title, description=desc, color=0xed4245)
        if w.get('banner'):
            # Note: L'image doit être accessible via une URL publique ou un proxy
            embed.set_image(url=f"http://{REDIRECT_URI.split(':')[1].replace('//','')}:49501{w['banner']}")
        await channel.send(embed=embed)

# --- ROUTES API ---
@app.route('/api/login')
def login():
    return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/api/callback')
def callback():
    code = request.args.get('code')
    data = {'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, 'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI}
    r = requests.post('https://discord.com/api/oauth2/token', data=data)
    token = r.json().get('access_token')
    user = requests.get('https://discord.com/api/users/@me', headers={'Authorization': f'Bearer {token}'}).json()
    session['user_id'] = user.get('id')
    return redirect('/')

def has_access():
    uid = session.get('user_id')
    if not uid: return False
    if str(uid) == str(OWNER_ID): return True
    config = load_config()
    guild = bot.get_guild(int(GUILD_ID))
    member = guild.get_member(int(uid)) if guild else None
    return any(r.name in config.get('admin_roles', []) for r in member.roles) if member else False

@app.route('/api/get_data')
def get_data():
    if not has_access(): return jsonify({"status": "unauthorized"}), 401
    guild = bot.get_guild(int(GUILD_ID))
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if r.name != "@everyone"],
        "config": load_config(),
        "images": [f"/public/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    })

@app.route('/api/save', methods=['POST'])
def save():
    if not has_access(): return jsonify({"status": "unauthorized"}), 401
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files['file']
    file.save(os.path.join(UPLOAD_FOLDER, file.filename))
    return jsonify({"status": "success"})

@app.route('/')
def index(): return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path): return send_from_directory('public', path)

if __name__ == '__main__':
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501), daemon=True).start()
    bot.run(TOKEN)
    
