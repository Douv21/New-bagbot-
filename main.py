import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory
import threading
import json
import os

# --- INITIALISATION ---
app = Flask(__name__)
UPLOAD_FOLDER = 'public/uploads'
CONFIG_FILE = 'config.json'

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except:
                return {"welcome": {}, "admin_roles": []}
    return {"welcome": {}, "admin_roles": []}

# --- BOT DISCORD ---
intents = discord.Intents.default()
intents.members = True 
intents.guilds = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot connecté en tant que : {bot.user}")

# --- ROUTES API ---

@app.route('/api/get_server_info', methods=['GET'])
def get_server_info():
    config = load_config()
    # Si le bot n'est pas prêt, on renvoie les listes vides mais on précise l'état
    if not bot.is_ready() or not bot.guilds:
        return jsonify({
            "status": "loading",
            "channels": [], 
            "all_roles": [], 
            "config": config
        })
    
    guild = bot.guilds[0]
    channels = [{"id": str(c.id), "name": c.name} for c in guild.text_channels]
    roles = [r.name for r in guild.roles if r.name != "@everyone"]
    
    return jsonify({
        "status": "success",
        "channels": channels,
        "all_roles": roles,
        "config": config
    })

@app.route('/api/save_config', methods=['POST'])
def save_config():
    try:
        data = request.json
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/images', methods=['GET'])
def list_images():
    files = os.listdir(UPLOAD_FOLDER)
    imgs = [f"/public/uploads/{f}" for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    return jsonify({"images": imgs})

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files: return "No file", 400
    file = request.files['file']
    if file:
        file.save(os.path.join(UPLOAD_FOLDER, file.filename))
        return jsonify({"status": "success"})

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        data = request.json
        
