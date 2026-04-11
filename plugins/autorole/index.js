<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BagBot Dashboard</title>
    <style>
        :root { --bg: #0a0a0a; --side: #111; --accent: #ff4d4d; --text: #fff; }
        body { margin: 0; font-family: sans-serif; background: var(--bg); color: var(--text); display: flex; height: 100vh; overflow: hidden; }
        
        /* Sidebar */
        .sidebar { width: 260px; background: var(--side); transition: 0.3s; border-right: 1px solid #222; position: relative; }
        .sidebar.collapsed { width: 80px; }
        .toggle-btn { position: absolute; right: -15px; top: 20px; background: var(--accent); border: none; color: #fff; border-radius: 5px; cursor: pointer; padding: 5px 10px; }
        
        .nav-item { padding: 20px; display: flex; align-items: center; color: #888; cursor: pointer; white-space: nowrap; overflow: hidden; }
        .nav-item:hover, .nav-item.active { color: #fff; background: #1a1a1a; border-left: 4px solid var(--accent); }
        .nav-text { margin-left: 20px; transition: 0.3s; }
        .collapsed .nav-text { display: none; }

        /* Main Content */
        .content { flex: 1; padding: 40px; overflow-y: auto; display: flex; justify-content: center; }
        .card { background: #151515; padding: 30px; border-radius: 12px; border: 1px solid #222; width: 100%; max-width: 600px; height: fit-content; }
        
        h1 { color: var(--accent); margin-top: 0; }
        .group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-size: 0.8rem; color: var(--accent); font-weight: bold; text-transform: uppercase; }
        
        select, input { width: 100%; padding: 12px; background: #222; border: 1px solid #333; color: #fff; border-radius: 6px; box-sizing: border-box; }
        .btn { background: var(--accent); color: #fff; border: none; padding: 15px; width: 100%; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: 0.3s; }
        .btn:hover { background: #cc0000; transform: translateY(-2px); }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar { position: absolute; left: -260px; z-index: 10; }
            .sidebar.active { left: 0; }
        }
    </style>
</head>
<body>

    <div class="sidebar" id="sidebar">
        <button class="toggle-btn" onclick="toggleSide()">☰</button>
        <div style="padding: 25px; font-weight: bold; color: var(--accent); text-align: center;" class="nav-text">BAG BOT V2</div>
        <div class="nav-item"><span>🏠</span><span class="nav-text">Général</span></div>
        <div class="nav-item active"><span>🎭</span><span class="nav-text">Rôles-Réactions</span></div>
        <div class="nav-item"><span>🛡️</span><span class="nav-text">Modération</span></div>
    </div>

    <div class="content">
        <div class="card">
            <h1>Rôles-Réactions</h1>
            <p style="color: #666; margin-bottom: 30px;">Envoyez un message de rôle automatique via ce formulaire.</p>

            <div class="group">
                <label>Nom du panneau</label>
                <input type="text" id="title" placeholder="Ex: Accès au serveur">
            </div>

            <div class="group">
                <label>Salon Discord</label>
                <select id="channels"><option>Chargement des salons...</option></select>
            </div>

            <div class="group">
                <label>Rôle à attribuer</label>
                <select id="roles"><option>Chargement des rôles...</option></select>
            </div>

            <button class="btn" onclick="deploy()">DÉPLOYER SUR LE SERVEUR</button>
        </div>
    </div>

    <script>
        function toggleSide() { document.getElementById('sidebar').classList.toggle('collapsed'); }

        async function init() {
            const [cReq, rReq] = await Promise.all([fetch('/api/channels'), fetch('/api/roles')]);
            const channels = await cReq.json();
            const roles = await rReq.json();

            document.getElementById('channels').innerHTML = channels.map(c => `<option value="${c.id}"># ${c.name}</option>`).join('');
            document.getElementById('roles').innerHTML = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }

        async function deploy() {
            const data = {
                title: document.getElementById('title').value,
                channelId: document.getElementById('channels').value,
                roleId: document.getElementById('roles').value
            };

            const res = await fetch('/update-bot', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            const result = await res.json();
            alert(result.success ? "✅ Panneau envoyé avec succès !" : "❌ Erreur");
        }

        init();
    </script>
</body>
</html>
            
