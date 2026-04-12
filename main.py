import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
import threading, os
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__, static_folder='public', static_url_path='')
UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

# --- NOUVELLE ROUTE DE TEST ---
@app.route('/api/test_message', methods=['POST'])
async def test_message():
    data = request.json
    channel_id = data.get('channel')
    title = data.get('title', 'Bienvenue')
    desc = data.get('desc', '')
    thumb = data.get('thumb')
    banner = data.get('banner')

    # Simulation des variables pour le test
    desc = desc.replace("{user}", bot.user.mention).replace("{user_name}", bot.user.name)
    desc = desc.replace("{server}", "Serveur de Test").replace("{count}", "123")

    channel = bot.get_channel(int(channel_id))
    if not channel: return jsonify({"error": "Salon introuvable"}), 404

    embed = discord.Embed(title=title, description=desc, color=0xed4245)
    if thumb: embed.set_thumbnail(url=thumb)
    if banner: embed.set_image(url=banner)
    embed.set_footer(text="Ceci est un message de test")

    await channel.send(content="🧪 **Test de configuration BagBot**", embed=embed)
    return jsonify({"status": "success"})

# (Gardez les autres routes api/upload, api/images, etc. du code précédent)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"status": "success", "url": f"/uploads/{filename}"})

@app.route('/api/images', methods=['GET'])
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"images": [f"/uploads/{f}" for f in files]})

@app.route('/api/get_server_info')
def get_info():
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return jsonify({"error": "Non trouvé"}), 404
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    return jsonify({"channels": channels, "bot": {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url)}})

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
