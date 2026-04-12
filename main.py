import discord
from discord.ext import commands
from flask import Flask, render_template, jsonify, request, make_response
import threading
import json
import os
from dotenv import load_dotenv

# 1. CHARGEMENT DES CONFIGURATIONS
load_dotenv()
TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

app = Flask(__name__, template_folder='templates')
CONFIG_FILE = "config_bot.json"

# --- SYSTÈME ANTI-CACHE (Pour forcer l'affichage du nouveau HTML) ---
@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r

# --- GESTION DES DONNÉES JSON ---
def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {}
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def save_config(data):
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=4)

# --- BOT DISCORD ---
intents = discord.Intents.default()
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ BagBot Connecté : {bot.user.name}")
    print(f"🌍 Serveur ID : {GUILD_ID}")

# --- ROUTES DASHBOARD ---

@app.route('/')
def index():
    # Force Flask à chercher dans le dossier templates
    return render_template('index.html')

@app.route('/api/get_server_info')
def get_info():
    if not GUILD_ID:
        return jsonify({"error": "GUILD_ID manquant dans le .env"}), 400
        
    guild = bot.get_guild(int(GUILD_ID))
    if not guild:
        return jsonify({"error": "Le bot n'est pas sur le serveur indiqué"}), 404
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    bot_info = {
        "name": bot.user.name,
        "avatar": str(bot.user.display_avatar.url),
        "id": str(bot.user.id)
    }
    return jsonify({"channels": channels, "bot": bot_info})

# LA ROUTE ÉVOLUTIVE : Sauvegarde n'importe quoi (Accueil, Mod, etc.)
@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    try:
        data = request.json
        category = data.get("category")  # ex: "accueil"
        settings = data.get("settings")  # contenu du formulaire
        
        config = load_config()
        config[category] = settings
        save_config(config)
        
        return jsonify({"status": "success", "message": f"Configuration '{category}' enregistrée"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- LANCEMENT ---
def run_flask():
    # On tourne sur le port 49501 comme sur tes captures
    app.run(host='0.0.0.0', port=49501, debug=False, use_reloader=False)

if __name__ == "__main__":
    # On lance Flask dans un thread séparé du bot
    t = threading.Thread(target=run_flask)
    t.start()
    bot.run(TOKEN)
    
