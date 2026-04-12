import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request, session, redirect, url_for
from flask_cors import CORS
from flask_session import Session
import threading, os, json, asyncio, requests
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")
SECRET_KEY = os.getenv("SECRET_KEY", "bagbot-secure-key")

# Ton ID Discord pour l'accès exclusif au menu Admin
OWNER_ID = "943487722738311219"

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config["SECRET_KEY"] = SECRET_KEY
Session(app)

UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
CONFIG_FILE = 'config.json'

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"admin_roles": ["Admin", "Fondateur"]}

def save_config(data):
    current = load_config()
    current.update(data)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(current, f, indent=4, ensure_ascii=False)

# --- AUTHENTIFICATION ---

@app.route('/login')
def login():
    url = f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify+guilds.members.read"
    return redirect(url)

@app.route('/login/callback')
def callback():
    code = request.args.get('code')
    data = {
        'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI
    }
    r = requests.post('https://discord.com/api/oauth2/token', data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    access_token = r.json().get('access_token')

    if not access_token: return "Erreur Token", 400

    headers = {'Authorization': f'Bearer {access_token}'}
    res = requests.get(f'https://discord.com/api/users/@me/guilds/{GUILD_ID}/member', headers=headers)
    
    if res.status_code == 200:
        member_data = res.json()
        user_id = member_data['user']['id']
        
        is_admin = False
        if user_id == OWNER_ID:
            is_admin = True
        else:
            guild = bot.get_guild(int(GUILD_ID))
            admin_names = load_config().get('admin_roles', [])
            for r_id in member_data.get('roles', []):
                role = guild.get_role(int(r_id))
                if role and role.name in admin_names:
                    is_admin = True
                    break
        
        if is_admin:
            session['admin'] = True
            session['user_id'] = user_id
            session['user_name'] = member_data['user']['username']
            return redirect('/')
    
    return "Accès refusé", 403

# --- API ---

@app.route('/')
def index():
    if not session.get('admin'): return redirect('/login')
    return send_from_directory('public', 'index.html')

@app.route('/api/get_server_info')
def get_info():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    guild = bot.get_guild(int(GUILD_ID))
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    all_roles = [role.name for role in guild.roles if role.name != "@everyone"]
    
    return jsonify({
        "channels": channels,
        "all_roles": sorted(all_roles),
        "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}, 
        "config": load_config(),
        "is_owner": session.get('user_id') == OWNER_ID
    })

@app.route('/api/save_roles', methods=['POST'])
def save_roles():
    if session.get('user_id') != OWNER_ID: return jsonify({"error": "Forbidden"}), 403
    roles = request.json.get('roles', [])
    save_config({"admin_roles": roles})
    return jsonify({"status": "success"})

# --- AUTRES ROUTES (IMAGES / MESSAGES) ---

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    path = request.json.get('path', '').replace('/uploads/', '')
    full_path = os.path.join(app.config['UPLOAD_FOLDER'], path)
    if os.path.exists(full_path): os.remove(full_path)
    return jsonify({"status": "success"})

@app.route('/api/test_message', methods=['POST'])
def test_message():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    data = request.json
    async def send_task():
        channel = bot.get_channel(int(data.get('channel')))
        if not channel: return
        def rep(t): return t.replace("{user}", bot.user.mention).replace("{server}", channel.guild.name).replace("{count}", str(channel.guild.member_count)).replace("{channel}", channel.mention).replace("{everyone}", "@everyone").replace("{here}", "@here")
        embed = discord.Embed(title=rep(data.get('title', '')), description=rep(data.get('desc', '')), color=0xed4245)
        files = []
        for key in ['thumb', 'banner']:
            val = data.get(key)
            if val and val.startswith('/uploads/'):
                fname = val.split('/')[-1]
                fpath = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                if os.path.exists(fpath):
                    files.append(discord.File(fpath, filename=fname))
                    if key == 'thumb': embed.set_thumbnail(url=f"attachment://{fname}")
                    else: embed.set_image(url=f"attachment://{fname}")
            elif val and val.startswith('http'):
                if key == 'thumb': embed.set_thumbnail(url=val)
                else: embed.set_image(url=val)
        await channel.send(embed=embed, files=files)
    asyncio.run_coroutine_threadsafe(send_task(), bot.loop)
    return jsonify({"status": "success"})

@app.route('/api/save_config', methods=['POST'])
def api_save():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    save_config(request.json)
    return jsonify({"status": "success"})

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask(): app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
                         
