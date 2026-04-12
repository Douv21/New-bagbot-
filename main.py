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
SECRET_KEY = os.getenv("SECRET_KEY", "bagbot-super-secret")

OWNER_ID = "943487722738311219"

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

app.config["SESSION_PERMANENT"] = True
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
            try:
                data = json.load(f)
                # Initialisation des clés si absentes
                for key in ["admin_roles", "trigger_roles", "target_channel"]:
                    if key not in data: data[key] = [] if "roles" in key else ""
                return data
            except: return {"admin_roles": [], "trigger_roles": [], "target_channel": ""}
    return {"admin_roles": [], "trigger_roles": [], "target_channel": ""}

def save_config(data):
    current = load_config()
    current.update(data)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(current, f, indent=4, ensure_ascii=False)

# --- BOT DISCORD ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot connecté en tant que {bot.user}")

@bot.event
async def on_member_update(before, after):
    # On vérifie si un rôle a été ajouté
    if len(before.roles) < len(after.roles):
        config = load_config()
        trigger_roles = config.get("trigger_roles", [])
        target_chan_id = config.get("target_channel")

        if not target_chan_id: return

        # On cherche quel rôle a été ajouté
        new_role = next(role for role in after.roles if role not in before.roles)
        
        # Si le rôle ajouté est dans la liste des rôles configurés
        if new_role.name in trigger_roles:
            channel = bot.get_channel(int(target_chan_id))
            if not channel: return

            def rep(t): 
                return t.replace("{user}", after.mention)\
                        .replace("{server}", after.guild.name)\
                        .replace("{count}", str(after.guild.member_count))\
                        .replace("{channel}", channel.mention)\
                        .replace("{everyone}", "@everyone")\
                        .replace("{here}", "@here")

            embed = discord.Embed(
                title=rep(config.get('title', 'Bienvenue !')), 
                description=rep(config.get('desc', '')), 
                color=0xed4245
            )

            # Gestion des images (uploads vs liens)
            for key in ['thumb', 'banner']:
                val = config.get(key)
                if val:
                    if val.startswith('/uploads/'):
                        fname = val.split('/')[-1]
                        fpath = os.path.join(UPLOAD_FOLDER, fname)
                        if os.path.exists(fpath):
                            file = discord.File(fpath, filename=fname)
                            if key == 'thumb': embed.set_thumbnail(url=f"attachment://{fname}")
                            else: embed.set_image(url=f"attachment://{fname}")
                            # Note: Envoi complexe avec fichiers locaux nécessite de l'envoyer ici
                            await channel.send(file=file, embed=embed)
                            return # On arrête ici car send est fait
                    else:
                        if key == 'thumb': embed.set_thumbnail(url=val)
                        else: embed.set_image(url=val)
            
            await channel.send(embed=embed)

# --- API FLASK ---

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
        session['admin'] = True
        session['user_id'] = str(member_data['user']['id'])
        session['user_name'] = member_data['user']['username']
        return redirect('/')
    return "Accès refusé.", 403

@app.route('/')
def index():
    if not session.get('admin'): return redirect('/login')
    return send_from_directory('public', 'index.html')

@app.route('/api/get_server_info')
def get_info():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return jsonify({"error": "Guild introuvable"}), 200
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    all_roles = [role.name for role in guild.roles if role.name != "@everyone"]
    
    return jsonify({
        "channels": channels,
        "all_roles": sorted(all_roles),
        "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}, 
        "config": load_config(),
        "is_owner": str(session.get('user_id')) == OWNER_ID,
        "user_connected": session.get('user_name', 'Utilisateur'),
        "server_name": guild.name,
        "member_count": guild.member_count
    })

@app.route('/api/save_config', methods=['POST'])
def api_save():
    if not session.get('admin'): return jsonify({"error": "Unauth"}), 401
    save_config(request.json)
    return jsonify({"status": "success"})

# (Gardez les autres routes API/images comme avant...)
@app.route('/api/upload', methods=['POST'])
def upload_file():
    file = request.files['file']; filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/test_message', methods=['POST'])
def test_message():
    data = request.json
    # Même logique que on_member_update mais manuel
    asyncio.run_coroutine_threadsafe(send_manual_test(data), bot.loop)
    return jsonify({"status": "success"})

async def send_manual_test(data):
    channel = bot.get_channel(int(data.get('channel')))
    if channel: await channel.send("Ceci est un test manuel de l'embed configuré.")

def run_flask(): app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
