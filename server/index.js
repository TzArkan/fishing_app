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
app.post('/api/register', async (req, res) => {
    try {
        const { nume, email, password } = req.body;

        if (!nume || !email || !password) {
            return res.status(400).json({ message: "Date incomplete!" });
        }

        // Verificăm dacă email-ul există deja
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "Email deja folosit!" });
        }

        // Inserăm utilizatorul
        const newUser = await pool.query(
            "INSERT INTO users (nume, email, password) VALUES ($1, $2, $3) RETURNING *",
            [nume, email, password]
        );

        res.status(201).json({ success: true, user: newUser.rows[0] });

    } catch (err) {
        console.error("Eroare register:", err.message);
        res.status(500).json({ message: "Eroare server" });
    }
});


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

        // verificăm dacă profilul există
        const profileCheck = await pool.query(
        'SELECT * FROM profiles WHERE user_id = $1',
        [user.rows[0].id]
        );

        if (profileCheck.rows.length === 0) {
        await pool.query(
            `INSERT INTO profiles (user_id)
            VALUES ($1)`,
            [user.rows[0].id]
        );
        }

        // Dacă totul e ok, trimitem datele utilizatorului înapoi
        res.json({ success: true, user: user.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId]
  );
  res.json(result.rows[0] || null);
});

app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { location, bio } = req.body;

    await pool.query(
      `UPDATE profiles
       SET location = $1,
           bio = $2,
       WHERE user_id = $3`,
      [location, bio, userId]
    );

    res.json({ message: 'Profil salvat' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare server' });
  }
});


app.post('/api/profile/avatar/:userId', upload.single('avatar'), async (req, res) => {
  const { userId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'Fișier lipsă' });
  }

  const avatarUrl = req.file.path.replace(/\\/g, '/');

  const result = await pool.query(
    'UPDATE profiles SET avatar_url=$1 WHERE user_id=$2 RETURNING *',
    [avatarUrl, userId]
  );

  res.json(result.rows[0]);
});
