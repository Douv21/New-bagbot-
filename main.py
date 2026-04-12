import discord
from discord.ext import commands
from flask import Flask, render_template, jsonify, request
import threading
import json
import os
from dotenv import load_dotenv

# Chargement des variables d'environnement
load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__)
CONFIG_FILE = "config_bot.json"

def load_config():
    if not os.path.exists(CONFIG_FILE): return {}
    with open(CONFIG_FILE, "r") as f: return json.load(f)

def save_config(data):
    with open(CONFIG_FILE, "w") as f: json.dump(data, f, indent=4)

# --- BOT DISCORD ---
intents = discord.Intents.default()
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ BagBot Connecté : {bot.user.name} ({bot.user.id})")
    print(f"🌍 Serveur Maître : {GUILD_ID}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_server_info')
def get_info():
    # On récupère les infos via l'ID Guild du .env
    guild = bot.get_guild(int(GUILD_ID))
    if not guild: return jsonify({"error": "Guild non trouvée"})
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    bot_info = {"name": bot.user.name, "avatar": str(bot.user.display_avatar.url), "id": str(bot.user.id)}
    return jsonify({"channels": channels, "bot": bot_info})

@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    try:
        data = request.json
        config = load_config()
        config[data["category"]] = data["settings"]
        save_config(config)
        return jsonify({"status": "success", "message": "Enregistré avec succès"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

def run_flask():
    app.run(host='0.0.0.0', port=49501)

if __name__ == "__main__":
    threading.Thread(target=run_flask).start()
    bot.run(TOKEN)
    
