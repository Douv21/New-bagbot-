import discord
from discord.ext import commands
from flask import Flask, request, jsonify, send_from_directory, session, redirect
import requests, threading, os, json
from dotenv import load_dotenv

load_dotenv()

# Variables d'environnement
TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GUILD_ID = os.getenv("GUILD_ID")
OWNER_ID = os.getenv("OWNER_ID")
# Utilise exactement celle-ci pour correspondre à ta capture
REDIRECT_URI = "http://192.168.1.133:49501/api/callback"

app = Flask(__name__)
app.secret_key = os.urandom(24)

@app.route('/')
def index():
    # Sert le fichier index.html situé dans le dossier 'public'
    return send_from_directory('public', 'index.html')

# LA ROUTE DE CONNEXION (C'est elle que le bouton doit appeler)
@app.route('/api/login')
def login():
    url = (f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}"
           f"&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify")
    return redirect(url)

# LA ROUTE DE RETOUR (Doit être identique à ta capture)
@app.route('/api/callback')
def callback():
    code = request.args.get('code')
    data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI
    }
    r = requests.post('https://discord.com/api/oauth2/token', data=data)
    resp = r.json()
    
    if 'access_token' in resp:
        user = requests.get('https://discord.com/api/users/@me', 
                            headers={'Authorization': f'Bearer {resp["access_token"]}'}).json()
        session['user_id'] = user.get('id')
        return redirect('/')
    return f"Erreur de connexion : {resp}"

@app.route('/api/get_server_info')
def get_info():
    if str(session.get('user_id')) != str(OWNER_ID):
        return jsonify({"status": "unauthorized"}), 401
    return jsonify({"status": "success", "message": "Connecté !"})

if __name__ == '__main__':
    # On lance sur le port 49501 comme sur tes captures
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=49501), daemon=True).start()
    bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())
    bot.run(TOKEN)
    
