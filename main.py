from flask import Flask, render_template, session, request, jsonify, redirect
import discord
from discord.ext import commands
import json
import os
import asyncio

app = Flask(__name__)
app.secret_key = "ton_secret_ici"

# --- CONFIGURATION BOT ---
TOKEN = "TON_TOKEN"
GUILD_ID = 123456789 # Ton ID de serveur
bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

def load_config():
    if not os.path.exists('config.json'): return {}
    with open('config.json', 'r') as f: return json.load(f)

def save_config(data):
    with open('config.json', 'w') as f: json.dump(data, f, indent=4)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_data')
def get_data():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    guild = bot.get_guild(GUILD_ID)
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    
    # On liste les images du dossier uploads
    images = [f"/uploads/{img}" for img in os.listdir('uploads')] if os.path.exists('uploads') else []
    
    return jsonify({
        "channels": channels,
        "roles": roles,
        "config": load_config(),
        "images": images,
        "user_name": session.get('user_name', 'Utilisateur') # Utilisé pour l'aperçu
    })

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    config = load_config()
    w = config.get('welcome', {})
    channel_id = w.get('channel')
    
    if not channel_id: return jsonify({"error": "No channel"}), 400
    
    channel = bot.get_channel(int(channel_id))
    if not channel: return jsonify({"error": "Channel not found"}), 404

    # Remplacement des variables pour le test réel sur Discord
    user_name = session.get('user_name', 'Utilisateur')
    guild_name = channel.guild.name
    count = str(channel.guild.member_count)

    def clean(text):
        return text.replace('{user}', user_name).replace('{guild}', guild_name).replace('{count}', count)

    embed = discord.Embed(
        title=clean(w.get('title', 'Bienvenue')),
        description=clean(w.get('desc', 'Message')),
        color=0xed4245
    )
    if w.get('banner'): embed.set_image(url=w.get('banner'))
    if w.get('thumbnail'): embed.set_thumbnail(url=w.get('thumbnail'))
    if w.get('footer'): embed.set_footer(text=clean(w.get('footer')))

    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "ok"})

@app.route('/api/save', methods=['POST'])
def save():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    save_config(request.json)
    return jsonify({"status": "ok"})

# Ajoute ici tes routes d'Oauth2 (login, callback) pour remplir la session['user_id'] et session['user_name']

if __name__ == '__main__':
    # Lance le bot en arrière-plan et Flask
    loop = asyncio.get_event_loop()
    loop.create_task(bot.start(TOKEN))
    app.run(host='0.0.0.0', port=49501)
    
