import discord
from discord.ext import commands
from flask import Flask, render_template, jsonify
import threading
import os
from dotenv import load_dotenv

# 1. Chargement des variables (Token et Guild ID) depuis ton .env local
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = int(os.getenv("GUILD_ID"))
PORT = 49501 

# 2. Configuration du Bot Discord
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="/", intents=intents)

# 3. Configuration de Flask pour pointer vers ton dossier GitHub "public"
app = Flask(__name__, 
            template_folder='public',      # Dossier où se trouve ton index.html
            static_folder='public',        # Dossier pour tes images/CSS
            static_url_path='')

@app.route('/')
def index():
    """Affiche ton index.html depuis le dossier public/"""
    try:
        return render_template('index.html')
    except Exception as e:
        return f"Fichier index.html introuvable dans le dossier 'public/'. Erreur : {e}", 404

@app.route('/api/get_server_info')
def get_server_info():
    """Récupère les infos du serveur pour le dashboard"""
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return jsonify({"error": "Serveur non trouvé"}), 404
    
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [{"id": str(r.id), "name": r.name} for r in guild.roles if r.name != "@everyone"]
    return jsonify({"channels": channels, "roles": roles})

@bot.event
async def on_ready():
    print("========================================")
    print(f"✅ BagBot Pro Connecté !")
    print(f"Dashboard : http://192.168.1.133:{PORT}")
    print("========================================")

# 4. Lancement des services
def run_flask():
    app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)

if __name__ == "__main__":
    # Flask tourne en arrière-plan
    threading.Thread(target=run_flask, daemon=True).start()
    # Le bot occupe le processus principal
    try:
        bot.run(TOKEN)
    except Exception as e:
        print(f"❌ Erreur de jeton ou de connexion : {e}")
                
