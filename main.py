import discord
from discord.ext import commands
from flask import Flask, render_template, jsonify
import threading
import os
from dotenv import load_dotenv

# 1. Chargement des variables d'environnement (Token et Guild ID)
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = int(os.getenv("GUILD_ID"))
PORT = 49501 

# 2. Configuration du Bot Discord
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="/", intents=intents)

# 3. Configuration de Flask pour utiliser ton dossier "public"
# On dit à Flask que les fichiers HTML sont dans 'public' au lieu de 'templates'
app = Flask(__name__, 
            template_folder='public', 
            static_folder='public',
            static_url_path='')

@app.route('/')
def index():
    """Affiche ton index.html qui se trouve dans le dossier public/"""
    try:
        return render_template('index.html')
    except Exception as e:
        return f"Erreur : Fichier index.html introuvable dans le dossier public/ ({e})", 404

@app.route('/api/get_server_info')
def get_server_info():
    """Envoie les salons et rôles au Dashboard"""
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return jsonify({"error": "Serveur non trouvé. Vérifiez le GUILD_ID"}), 404
    
    # Récupération des salons textuels
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    
    # Récupération des rôles (sans @everyone)
    roles = [{"id": str(r.id), "name": r.name} for r in guild.roles if r.name != "@everyone"]
    
    return jsonify({
        "status": "online",
        "channels": channels, 
        "roles": roles
    })

@bot.event
async def on_ready():
    """Log quand le bot est en ligne sur Discord"""
    print("========================================")
    print(f"✅ BagBot Pro est opérationnel !")
    print(f"Lien : http://192.168.1.133:{PORT}")
    print("========================================")

# 4. Lancement de Flask et du Bot
def run_flask():
    """Lance le serveur Web sur le port 49501"""
    app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)

if __name__ == "__main__":
    # Lancement de l'interface web dans un thread séparé
    threading.Thread(target=run_flask, daemon=True).start()
    
    # Lancement du bot Discord
    try:
        bot.run(TOKEN)
    except Exception as e:
        print(f"❌ Erreur critique : {e}")
      
