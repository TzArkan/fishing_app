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
        // 1. Citim datele (AM SCOS lat și lng de aici)
        // Am adăugat data_capturii
        const { specie, lungime, detalii, user_id, data_capturii } = req.body; 
        
        const pozaUrl = req.file ? req.file.path.replace(/\\/g, "/") : null;

        // 2. Comanda SQL curată
        // Avem 6 coloane, deci folosim $1 până la $6
        const newCatch = await pool.query(
            "INSERT INTO capturi (specie, lungime, detalii, poza_url, user_id, data_capturii) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [specie, lungime, detalii, pozaUrl, user_id, data_capturii]
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
        const { userId } = req.query; // Citim parametrul din URL

        if (!userId) {
            return res.status(400).json({ message: "Lipseste user ID!" });
        }

        const allCatches = await pool.query(
            "SELECT * FROM capturi WHERE user_id = $1 ORDER BY id DESC", 
            [userId]
        );
        res.json(allCatches.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

app.delete('/api/capturi/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM capturi WHERE id = $1", [id]);
        res.json({ message: "Captura ștearsă!" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

// 4. ACTUALIZARE CAPTURĂ (EDIT - doar text momentan)
app.put('/api/capturi/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { specie, lungime, detalii } = req.body; // Luăm noile date

        await pool.query(
            "UPDATE capturi SET specie = $1, lungime = $2, detalii = $3 WHERE id = $4",
            [specie, lungime, detalii, id]
        );
        res.json({ message: "Captura actualizată!" });
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
app.post('/api/capturi', upload.single('poza'), async (req, res) => {
    try {
        // 1. Citim și data_capturii din formular
        const { specie, lungime, detalii, lat, lng, user_id, data_capturii } = req.body; 
        
        const pozaUrl = req.file ? req.file.path.replace(/\\/g, "/") : null;

        // 2. Adăugăm coloana în SQL (atenție la $8)
        const newCatch = await pool.query(
            "INSERT INTO capturi (specie, lungime, detalii, poza_url, latitudine, longitudine, user_id, data_capturii) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [specie, lungime, detalii, pozaUrl, lat, lng, user_id, data_capturii]
        );
        res.json(newCatch.rows[0]);
    } catch (err) {
        console.error("Eroare la adaugare:", err.message);
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