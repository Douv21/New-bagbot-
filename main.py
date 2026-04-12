import os
import json
import asyncio
import discord
from discord.ext import commands
from flask import Flask, render_template, session, request, jsonify, redirect

# --- CONFIG ---
TOKEN = "TON_TOKEN"
CLIENT_ID = "TON_ID"
CLIENT_SECRET = "TON_SECRET"
REDIRECT_URI = "http://192.168.1.133:49501/login/callback"
GUILD_ID = 123456789 # Ton ID de serveur

app = Flask(__name__, static_folder='public', static_url_for_path='/')
app.secret_key = "cle_secrete"

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

def load_config():
    if not os.path.exists('config.json'): return {"welcome": {}, "admin_roles": []}
    with open('config.json', 'r') as f: return json.load(f)

def save_config(data):
    with open('config.json', 'w') as f: json.dump(data, f, indent=4)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/get_data')
def get_data():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    guild = bot.get_guild(GUILD_ID)
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    images = [f"/uploads/{img}" for img in os.listdir('public/uploads')] if os.path.exists('public/uploads') else []
    return jsonify({
        "channels": channels, "roles": roles, "config": load_config(),
        "images": images, "user_name": session.get('user_name', 'Utilisateur')
    })

@app.route('/api/test_welcome', methods=['POST'])
def test_welcome():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    config = load_config().get('welcome', {})
    channel = bot.get_channel(int(config.get('channel')))
    if not channel: return jsonify({"error": "No channel"}), 400

    u_name = session.get('user_name', 'Test')
    g_name = channel.guild.name
    count = str(channel.guild.member_count)
    
    def clean(t): return t.replace('{user}', u_name).replace('{guild}', g_name).replace('{count}', count)

    embed = discord.Embed(title=clean(config.get('title','')), description=clean(config.get('desc','')), color=0xed4245)
    if config.get('banner'): embed.set_image(url=config.get('banner'))
    if config.get('thumbnail'): embed.set_thumbnail(url=config.get('thumbnail'))
    if config.get('footer'): embed.set_footer(text=clean(config.get('footer')))

    bot.loop.create_task(channel.send(embed=embed))
    return jsonify({"status": "ok"})

@app.route('/api/save', methods=['POST'])
def save():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    save_config(request.json)
    return jsonify({"status": "ok"})

# Ajoute ici tes fonctions de login/callback OAuth2 pour remplir session['user_id']

if __name__ == "__main__":
    import threading
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501, use_reloader=False)).start()
    bot.run(TOKEN)
    
