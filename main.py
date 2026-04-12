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
            except: return {"welcome": {}, "admin_roles": []}
    return {"welcome": {}, "admin_roles": []}

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

# Déclenchement automatique
@bot.event
async def on_member_update(before, after):
    config = load_config()
    w = config.get('welcome', {})
    trigger_role_name = w.get('trigger_role')
    
    # Si un rôle déclencheur est défini, on vérifie si l'utilisateur vient de le recevoir
    if trigger_role_name:
        role = discord.utils.get(after.guild.roles, name=trigger_role_name)
        if role in after.roles and role not in before.roles:
            await send_welcome(after, w)
    
@bot.event
async def on_member_join(member):
    config = load_config()
    w = config.get('welcome', {})
    # Si pas de rôle déclencheur, on envoie direct
    if not w.get('trigger_role'):
        await send_welcome(member, w)

async def send_welcome(member, w):
    channel = bot.get_channel(int(w.get('channel')))
    if not channel: return
    
    title = w.get('title', '').replace('{user}', member.name)
    desc = w.get('desc', '').replace('{user}', member.mention)
    
    embed = discord.Embed(title=title, description=desc, color=0xed4245)
    host = f"http://{request.host}" if request else "" # Pour le test manuel
    
    if w.get('banner'): embed.set_image(url=f"{w['banner']}")
    if w.get('thumbnail'): embed.set_thumbnail(url=f"{w['thumbnail']}")
    if w.get('footer'): embed.set_footer(text=w.get('footer').replace('{user}', member.name))
    
    await channel.send(content=member.mention, embed=embed)

# --- API ---
@app.route('/api/login')
def login(): return redirect(f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")

@app.route('/api/callback')
def callback():
    code = request.args.get('code')
    data = {'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, 'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI}
    r = requests.post('https://discord.com/api/oauth2/token', data=data)
    token = r.json().get('access_token')
    user = requests.get('https://discord.com/api/users/@me', headers={'Authorization': f'Bearer {token}'}).json()
    session['user_id'] = user.get('id')
    return redirect('/')

@app.route('/api/get_data')
def get_data():
    uid = session.get('user_id')
    if not uid: return jsonify({"status": "unauthorized"}), 401
    guild = bot.get_guild(int(GUILD_ID))
    return jsonify({
        "channels": [{"id": str(c.id), "name": c.name} for c in guild.text_channels],
        "roles": [r.name for r in guild.roles if r.name != "@everyone"],
        "config": load_config(),
        "images": [f"/public/uploads/{f}" for f in os.listdir(UPLOAD_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    })

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files['file']
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)
    return jsonify({"url": f"/public/uploads/{file.filename}"})

@app.route('/api/save', methods=['POST'])
def save():
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, indent=4, ensure_ascii=False)
    return jsonify({"status": "success"})

@app.route('/')
def index(): return send_from_directory('public', 'index.html')

@app.route('/public/<path:path>')
def serve_public(path): return send_from_directory('public', path)

if __name__ == '__main__':
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501), daemon=True).start()
    bot.run(TOKEN)
    
