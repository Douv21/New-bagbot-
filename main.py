import discord
from discord.ext import commands
from flask import Flask, render_template, jsonify, request
import threading
import json
import os

# --- CONFIGURATION ---
TOKEN = "TON_TOKEN_ICI"
app = Flask(__name__)
CONFIG_FILE = "config_bot.json"

# Fonction pour charger/sauvegarder les données sans crash
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
    print(f"✅ BagBot Pro Connecté : {bot.user}")

# --- ROUTES API (Dashboard) ---

@app.route('/')
def index():
    return render_template('index.html')

# RÉCUPÉRER LES SALONS (Pour les menus déroulants)
@app.route('/api/get_server_info')
def get_info():
    guild = bot.guilds[0] if bot.guilds else None
    if not guild: return jsonify({"error": "No guild found"})
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    return jsonify({"channels": channels})

# LA ROUTE MAÎTRE : Enregistre n'importe quelle catégorie !
@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    try:
        new_data = request.json
        category = new_data.get("category") # ex: "accueil", "automod"
        settings = new_data.get("settings") # les champs de l'embed
        
        current_config = load_config()
        current_config[category] = settings # On ajoute ou modifie la catégorie dynamiquement
        
        save_config(current_config)
        print(f"💾 Mise à jour reçue pour : {category}")
        return jsonify({"status": "success", "message": f"Configuration {category} enregistrée"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- LANCEMENT ---
def run_flask():
    app.run(host='0.0.0.0', port=49501)

if __name__ == "__main__":
    t = threading.Thread(target=run_flask)
    t.start()
    bot.run(TOKEN)
            
