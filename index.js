let db = {};
let activeP = { mode: '', type: '' };

// Navigation & Sidebar
document.getElementById('burger-btn').onclick = () => document.getElementById('sidebar').classList.toggle('open');

function tab(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    if(id !== 'gallery') localStorage.setItem('last', id);
}

// Live Sync Discord Preview
function sync() {
    ['welcome', 'leave'].forEach(m => {
        const p = m[0];
        const color = document.getElementById(p+'-color').value;
        const title = document.getElementById(p+'-title').value;
        const desc = document.getElementById(p+'-desc').value;

        document.getElementById('pv-'+p+'-box').style.borderLeftColor = color;
        document.getElementById('pv-'+p+'-title').innerText = title || "Titre";
        document.getElementById('pv-'+p+'-desc').innerText = desc || "Message...";
        if(p === 'w') document.getElementById('pv-w-footer').innerText = document.getElementById('w-footer').value || "Footer";
    });
}

// Image Selection
function pick(mode, type) {
    activeP = { mode, type };
    tab('gallery');
}

function selectImg(url) {
    const img = document.getElementById(`img-${activeP.mode[0]}-${activeP.type}`);
    img.src = url;
    img.style.display = 'block';
    img.dataset.url = url;
    tab(localStorage.getItem('last'));
}

// Data Handling
async function init() {
    const res = await fetch('/api/get_data');
    db = await res.json();
    
    const opts = db.channels.map(c => `<option value="${c.id}"># ${c.name}</option>`).join('');
    document.getElementById('w-channel').innerHTML = opts;
    document.getElementById('l-channel').innerHTML = opts;

    ['welcome', 'leave'].forEach(m => {
        const p = m[0], conf = db.config[m];
        document.getElementById(p+'-title').value = conf.title || "";
        document.getElementById(p+'-desc').value = conf.desc || "";
        document.getElementById(p+'-color').value = conf.color || "#ed4245";
        document.getElementById(p+'-channel').value = conf.channel || "";
        if(p === 'w') document.getElementById('w-footer').value = conf.footer || "";
        
        ['banner', 'thumbnail', 'footer_icon'].forEach(t => {
            if(conf[t]) {
                const el = document.getElementById(`img-${p}-${t}`);
                if(el) { el.src = conf[t]; el.style.display = 'block'; el.dataset.url = conf[t]; }
            }
        });
    });

    renderG();
    sync();
}

function renderG() {
    document.getElementById('g-list').innerHTML = db.images.map(url => `
        <div class="g-img" onclick="selectImg('${url}')"><img src="${url}" style="display:block"></div>
    `).join('');
}

async function upload() {
    const file = document.getElementById('up-input').files[0];
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const res = await r.json();
    db.images.push(res.path); renderG(); selectImg(res.path);
}

async function save() {
    const config = {
        welcome: {
            title: document.getElementById('w-title').value,
            desc: document.getElementById('w-desc').value,
            color: document.getElementById('w-color').value,
            footer: document.getElementById('w-footer').value,
            channel: document.getElementById('w-channel').value,
            banner: document.getElementById('img-w-banner').dataset.url || "",
            thumbnail: document.getElementById('img-w-thumbnail').dataset.url || "",
            footer_icon: document.getElementById('img-w-footer_icon').dataset.url || ""
        },
        leave: {
            title: document.getElementById('l-title').value,
            desc: document.getElementById('l-desc').value,
            color: document.getElementById('l-color').value,
            channel: document.getElementById('l-channel').value,
            banner: document.getElementById('img-l-banner').dataset.url || ""
        }
    };
    await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    alert("✅ Config Elite V9 Sauvegardée !");
}

function addV(id, v) { document.getElementById(id).value += v; sync(); }
window.onload = init;
