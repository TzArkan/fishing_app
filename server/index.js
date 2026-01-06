const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Asigurăm existența folderului 'uploads' pentru poze
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
// Facem folderul public ca să putem vedea pozele în frontend
app.use('/uploads', express.static('uploads'));

// Configurare Baza de Date
const pool = new Pool({
  user: 'postgres.vdltfoaglomyxvfrsmur',
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  database: 'postgres',
  password: 'UU2aqx$EhG7b9/Y', // <--- PUNE PAROLA TA AICI
  port: 6543,
});

// Configurare stocare poze (Multer)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      // Punem timestamp în nume ca să fie unic
      cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// --- RUTE API ---

// 1. Adăugare captură
app.post('/api/capturi', upload.single('poza'), async (req, res) => {
    try {
        const { specie, lungime, detalii, lat, lng } = req.body;
        // Dacă avem poză, salvăm calea. Atenție la slash-uri pentru Windows.
        const pozaUrl = req.file ? req.file.path.replace(/\\/g, "/") : null;

        const newCatch = await pool.query(
            "INSERT INTO capturi (specie, lungime, detalii, poza_url, latitudine, longitudine) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [specie, lungime, detalii, pozaUrl, lat, lng]
        );
        res.json(newCatch.rows[0]);
    } catch (err) {
        console.error("Eroare la adaugare:", err.message);
        res.status(500).send("Eroare server");
    }
});

// 2. Obținere toate capturile
app.get('/api/capturi', async (req, res) => {
    try {
        const allCatches = await pool.query("SELECT * FROM capturi ORDER BY id DESC");
        res.json(allCatches.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

// Pornire server
app.listen(port, () => {
    console.log(`Serverul backend rulează pe portul ${port}`);
});

// --- RUTE DE AUTENTIFICARE ---

// 1. REGISTER (Înregistrare utilizator nou)
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, nume } = req.body;
        
        // Verificăm dacă există deja
        const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ message: "Acest email este deja folosit!" });
        }

        // Inserăm utilizatorul (Notă: În producție parola ar trebui criptată!)
        const newUser = await pool.query(
            "INSERT INTO users (email, password, nume) VALUES ($1, $2, $3) RETURNING id, email, nume",
            [email, password, nume]
        );
        
        res.json({ success: true, user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

// 2. LOGIN (Verificare credențiale)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Căutăm utilizatorul după email
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({ message: "Email sau parolă incorectă!" });
        }

        // Verificăm parola (simplu pentru acest exercițiu)
        if (password !== user.rows[0].password) {
            return res.status(401).json({ message: "Email sau parolă incorectă!" });
        }

        // Dacă totul e ok, trimitem datele utilizatorului înapoi
        res.json({ success: true, user: user.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});