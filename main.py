import discord
from discord.ext import commands
from flask import Flask, send_from_directory, jsonify, request
import threading
import json
import os
from dotenv import load_dotenv

# CHARGEMENT .ENV
load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

# On définit explicitement le dossier public pour les fichiers statiques
app = Flask(__name__, static_folder='public', static_url_path='')
CONFIG_FILE = "config_bot.json"

# --- DESACTIVATION TOTALE DU CACHE ---
@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

# --- ROUTES ---

@app.route('/')
def index():
    # Envoie le fichier index.html directement depuis le dossier public
    return send_from_directory('public', 'index.html')

@app.route('/api/get_server_info')
def get_info():
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return jsonify({"error": "Serveur non trouvé"}), 404
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    bot_info = {
        "name": bot.user.name,
        "avatar": str(bot.user.display_avatar.url),
        "id": str(bot.user.id)
    }
    return jsonify({"channels": channels, "bot": bot_info})

@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    try:
        data = request.json
        with open(CONFIG_FILE, "w") as f:
            json.dump(data, f, indent=4)
        return jsonify({"status": "success", "message": "Sauvegardé !"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- BOT DISCORD ---
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

def run_flask():
    app.run(host='0.0.0.0', port=49501, debug=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
