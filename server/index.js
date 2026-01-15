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

// ==========================================
// ⚠️ CALEA FIXĂ PENTRU DOCKER (NU MODIFICĂM)
// ==========================================
const uploadDir = '/app/uploads';

// Dacă folderul nu există în container, îl creăm
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Facem folderul public
app.use('/uploads', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static(uploadDir));

// Configurare Baza de Date (SUPABASE) - RĂMÂNE LA FEL
const pool = new Pool({
  user: 'postgres.vdltfoaglomyxvfrsmur',
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  database: 'postgres',
  password: 'UU2aqx$EhG7b9/Y', 
  port: 6543,
  ssl: {
    rejectUnauthorized: false
  }
});

// Configurare stocare poze (Multer) - RĂMÂNE LA FEL
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        const numeSimplu = 'img_' + Date.now() + path.extname(file.originalname);
        cb(null, numeSimplu);
    }
});
const upload = multer({ storage: storage });


// ================= RUTE API (LOGICĂ REPARATĂ) =================

// --- 1. CAPTURI (Add, Get, Delete, Edit) ---

// ADĂUGARE CAPTURĂ (REPARAT: Verifică strict ID-ul utilizatorului)
app.post('/api/capturi', upload.single('poza'), async (req, res) => {
    try {
        // 1. Preluăm datele. Citim și user_id și userId ca să fim siguri.
        let { specie, lungime, detalii, user_id, userId, data_capturii } = req.body;
        
        // ⚠️ FIX: Alegem ID-ul care nu e gol.
        const finalUserId = user_id || userId;

        console.log(`[ADD] Se încearcă adăugarea pentru User ID: ${finalUserId}`);

        // Dacă nu avem ID, refuzăm salvarea (altfel apare la "toată lumea" sau dă eroare)
        if (!finalUserId) {
            console.error("[ADD FAIL] Lipseste User ID!");
            return res.status(400).json({ message: "Eroare: Nu ești logat sau ID-ul lipsește." });
        }

        // 2. Procesare Cale Poză
        let pozaUrl = null;
        if (req.file) {
            pozaUrl = 'uploads/' + req.file.filename;
        }

        // 3. Inserare în Bază
        const newCatch = await pool.query(
            "INSERT INTO capturi (specie, lungime, detalii, poza_url, user_id, data_capturii) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [specie, lungime, detalii, pozaUrl, finalUserId, data_capturii]
        );
        
        console.log(`[ADD SUCCESS] Captura ID ${newCatch.rows[0].id} salvată pentru user ${finalUserId}`);
        res.json(newCatch.rows[0]);

    } catch (err) {
        console.error("Eroare la adaugare (DB):", err.message);
        res.status(500).send("Eroare server la salvare");
    }
});

// OBȚINERE CAPTURI (REPARAT: Filtrează strict după User ID)
app.get('/api/capturi', async (req, res) => {
    try {
        const { userId } = req.query; 
        
        if (!userId) {
            console.log("[GET FAIL] Cerere fără UserId");
            return res.status(400).json({ message: "UserId lipsește!" });
        }

        console.log(`[GET] Se cer capturile pentru User ID: ${userId}`);

        // ⚠️ FIX: WHERE user_id = $1 este obligatoriu ca să nu vadă alții pozele
        const allCapturi = await pool.query(
            "SELECT * FROM capturi WHERE user_id = $1 ORDER BY id DESC", 
            [userId]
        );
        
        res.json(allCapturi.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

// GET SINGLE (RĂMÂNE LA FEL)
app.get('/api/capturi/single/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM capturi WHERE id = $1", [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Captura nu există" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

// ȘTERGERE CAPTURĂ (RĂMÂNE LA FEL)
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

// ACTUALIZARE CAPTURĂ (RĂMÂNE LA FEL)
app.put('/api/capturi/:id', upload.single('poza'), async (req, res) => {
    try {
        const { id } = req.params;
        const { specie, lungime, detalii } = req.body;

        let pozaUrl = null;
        if (req.file) {
            pozaUrl = 'uploads/' + req.file.filename;
        }

        await pool.query(
            "UPDATE capturi SET specie = $1, lungime = $2, detalii = $3, poza_url = COALESCE($4, poza_url) WHERE id = $5",
            [specie, lungime, detalii, pozaUrl, id]
        );

        res.json({ message: "Captura actualizată!" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});


// --- 2. AUTH (Register, Login) --- (RĂMÂN LA FEL)

app.post('/api/register', async (req, res) => {
    try {
        const { nume, email, password } = req.body;

        if (!nume || !email || !password) {
            return res.status(400).json({ message: "Date incomplete!" });
        }

        const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "Email deja folosit!" });
        }

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

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({ message: "Email incorect!" });
        }
        if (password !== user.rows[0].password) {
            return res.status(401).json({ message: "Parolă incorectă!" });
        }

        const profileCheck = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [user.rows[0].id]);
        if (profileCheck.rows.length === 0) {
            await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [user.rows[0].id]);
        }

        res.json({ success: true, user: user.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});


// --- 3. PROFIL (RĂMÂN LA FEL) ---

app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  res.json(result.rows[0] || null);
});

app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { nume, location, bio } = req.body;

    await pool.query("UPDATE users SET nume = $1 WHERE id = $2", [nume, userId]);

    const checkProfile = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);

    if (checkProfile.rows.length > 0) {
        await pool.query(
            "UPDATE profiles SET location = $1, bio = $2 WHERE user_id = $3",
            [location, bio, userId]
        );
    } else {
        await pool.query(
            "INSERT INTO profiles (user_id, location, bio) VALUES ($1, $2, $3)",
            [userId, location, bio]
        );
    }

    res.json({ message: 'Profil și nume salvate!' });
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

  const avatarUrl = 'uploads/' + req.file.filename;

  const checkProfile = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
  
  if (checkProfile.rows.length === 0) {
      await pool.query("INSERT INTO profiles (user_id, avatar_url) VALUES ($1, $2)", [userId, avatarUrl]);
  } else {
      await pool.query('UPDATE profiles SET avatar_url=$1 WHERE user_id=$2', [avatarUrl, userId]);
  }

  res.json({ avatar_url: avatarUrl });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Cale Uploads configurată la: ${uploadDir}`);
});