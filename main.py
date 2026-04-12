import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import threading, os, json, asyncio
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)
UPLOAD_FOLDER = 'public/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

TOKEN = "TON_TOKEN"
GUILD_ID = "TON_ID"

@app.route('/')
def index(): return send_from_directory('public', 'index.html')

@app.route('/api/get_server_info')
def get_info():
    try:
        guild = bot.get_guild(int(GUILD_ID))
        channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
        return jsonify({"channels": channels, "bot": {"name": bot.user.name}, "config": {}})
    except: return jsonify({"error": "Erreur"}), 500

@app.route('/api/test_message', methods=['POST'])
def test_message():
    data = request.json
    async def send_task():
        channel = bot.get_channel(int(data.get('channel')))
        if not channel: return
        
        embed = discord.Embed(title=data.get('title', ''), description=data.get('desc', ''), color=0xed4245)
        files = []
        for key in ['thumb', 'banner']:
            val = data.get(key)
            if val and val.startswith('/uploads/'):
                fname = val.split('/')[-1]
                path = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                if os.path.exists(path):
                    files.append(discord.File(path, filename=fname))
                    if key == 'thumb': embed.set_thumbnail(url=f"attachment://{fname}")
                    else: embed.set_image(url=f"attachment://{fname}")
        # Envoi unique : l'image est liée à l'embed via attachment://
        await channel.send(embed=embed, files=files)

    asyncio.run_coroutine_threadsafe(send_task(), bot.loop)
    return jsonify({"status": "success"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"/uploads/{filename}"})

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents)
def run_flask(): app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
