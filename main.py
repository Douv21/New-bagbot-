import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request, session, redirect, url_for
from flask_cors import CORS
from flask_session import Session
import threading, os, json, asyncio, requests
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# --- CHARGEMENT DES CONFIGURATIONS ---
load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")
SECRET_KEY = os.getenv("SECRET_KEY", "bagbot-super-secret")

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# Configuration de la session (stockage côté serveur)
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

# --- AUTHENTIFICATION DISCORD OAUTH2 ---

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

    if not access_token:
        return "Erreur : Impossible de récupérer le token Discord.", 400

    headers = {'Authorization': f'Bearer {access_token}'}
    res = requests.get(f'https://discord.com/api/users/@me/guilds/{GUILD_ID}/member', headers=headers)
    
    if res.status_code == 200:
        member_data = res.json()
        user_id = member_data['user']['id']
        user_roles_ids = member_data.get('roles', [])
        
        is_admin = False
        
        # SÉCURITÉ : Accès forcé pour le Fondateur (Toi)
        if user_id == "943487722738311219":
            is_admin = True
        else:
            # Vérification par rôles pour les autres
            guild = bot.get_guild(int(GUILD_ID))
            admin_names = load_config().get('admin_roles', [])
            for r_id in user_roles_ids:
                role = guild.get_role(int(r_id))
                if role and role.name in admin_names:
                    is_admin = True
                    break
        
        if is_admin:
            session['admin'] = True
            session['user_name'] = member_data['user']['username']
            return redirect('/')
    
    return "Accès refusé : Rôles insuffisants sur le serveur.", 403

# --- API ET DASHBOARD ---

@app.route('/')
def index():
    if not session.get('admin'): return redirect('/login')
    return send_from_directory('public', 'index.html')

@app.route('/api/check_admin')
def check_admin():
    return jsonify({"is_admin": session.get('admin', False)})

@app.route('/api/get_server_info')
def get_info():
    if not session.get('admin'): return jsonify({"error": "Unauthorized"}), 401
    guild = bot.get_guild(int(GUILD_ID))
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    return jsonify({
        "channels": channels, 
        "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}, 
        "config": load_config()
    })

@app.route('/api/save_roles', methods=['POST'])
def save_roles_api():
    if not session.get('admin'): return jsonify({"error": "Unauthorized"}), 401
    roles = request.json.get('roles', [])
    save_config({"admin_roles": roles})
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if not session.get('admin'): return jsonify({"error": "Unauthorized"}), 401
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    if not session.get('admin'): return jsonify({"error": "Unauthorized"}), 401
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    if not session.get('admin'): return jsonify({"error": "Unauthorized"}), 401
    path = request.json.get('path', '').replace('/uploads/', '')
    full_path = os.path.join(app.config['UPLOAD_FOLDER'], path)
    if os.path.exists(full_path):
        os.remove(full_path)
        return jsonify({"status": "success"})
    return jsonify({"error": "Fichier introuvable"}), 404

@app.route('/api/test_message', methods=['POST'])
def test_message():
    if not session.get('admin'): return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    async def send_task():
        channel = bot.get_channel(int(data.get('channel')))
        if not channel: return

        def rep(text):
            return text.replace("{user}", bot.user.mention).replace("{server}", channel.guild.name).replace("{count}", str(channel.guild.member_count)).replace("{channel}", channel.mention).replace("{everyone}", "@everyone").replace("{here}", "@here")

        embed = discord.Embed(title=rep(data.get('title', '')), description=rep(data.get('desc', '')), color=0xed4245)
        files_to_send = []

        def process_img(key, attr_fn):
            val = data.get(key)
            if val and val.startswith('/uploads/'):
                fname = val.split('/')[-1]
                fpath = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                if os.path.exists(fpath):
                    discord_file = discord.File(fpath, filename=fname)
                    files_to_send.append(discord_file)
                    attr_fn(url=f"attachment://{fname}")
            elif val and val.startswith('http'):
                attr_fn(url=val)

        process_img('thumb', embed.set_thumbnail)
        process_img('banner', embed.set_image)

        await channel.send(embed=embed, files=files_to_send)

    asyncio.run_coroutine_threadsafe(send_task(), bot.loop)
    return jsonify({"status": "success"})

@app.route('/api/save_config', methods=['POST'])
def api_save():
    if not session.get('admin'): return jsonify({"error": "Unauthorized"}), 401
    save_config(request.json)
    return jsonify({"status": "success"})

# --- INITIALISATION DU BOT ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    # Écoute sur 0.0.0.0 pour permettre l'accès réseau (Smartphone/PC)
    app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
