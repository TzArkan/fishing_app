const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'fishingapp26@gmail.com',
        pass: 'fnvx eojy pczz cfxa'
    }
});

const uploadDir = '/app/uploads';

if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static(uploadDir));

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

app.post('/api/capturi', upload.single('poza'), async (req, res) => {
    try {
        let { specie, lungime, detalii, user_id, userId, data_capturii } = req.body;
        const finalUserId = user_id || userId;
        console.log(`[ADD] Se încearcă adăugarea pentru User ID: ${finalUserId}`);

        if (!finalUserId) {
            console.error("[ADD FAIL] Lipseste User ID!");
            return res.status(400).json({ message: "Eroare: Nu ești logat sau ID-ul lipsește." });
        }

        let pozaUrl = null;
        if (req.file) {
            pozaUrl = 'uploads/' + req.file.filename;
        }

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


app.post('/api/capturi/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, text } = req.body; 

        if (!text || !userId) {
            return res.status(400).json({ message: "Textul si UserID sunt obligatorii" });
        }

        const newComment = await pool.query(
            "INSERT INTO comments (captura_id, user_id, text) VALUES ($1, $2, $3) RETURNING *",
            [id, userId, text]
        );

        const userDetails = await pool.query("SELECT nume FROM users WHERE id = $1", [userId]);
        
        const commentResponse = {
            ...newComment.rows[0],
            user_name: userDetails.rows[0]?.nume || "Anonim"
        };

        res.json(commentResponse);

    } catch (err) {
        console.error("Eroare comment:", err);
        res.status(500).send("Eroare server");
    }
});

// --- 4. LOCAȚII DE PESCUIT (MAPS) ---

// Adaugă o locație nouă
app.post('/api/spots', async (req, res) => {
    try {
        const { userId, name, latitude, longitude, details } = req.body;
        
        if (!userId || !latitude || !longitude) {
            return res.status(400).json({ message: "Date incomplete!" });
        }

        const newSpot = await pool.query(
            "INSERT INTO fishing_spots (user_id, name, latitude, longitude, details) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [userId, name, latitude, longitude, details]
        );

        res.json(newSpot.rows[0]);
    } catch (err) {
        console.error("Eroare la salvare locație:", err);
        res.status(500).send("Eroare server");
    }
});

// Citește locațiile unui user
app.get('/api/spots', async (req, res) => {
    try {
        const { userId } = req.query;
        const result = await pool.query("SELECT * FROM fishing_spots WHERE user_id = $1", [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

app.get('/api/capturi', async (req, res) => {
    try {
        const { userId } = req.query; 
        if (!userId) {
            console.log("[GET FAIL] Cerere fără UserId");
            return res.status(400).json({ message: "UserId lipsește!" });
        }
        console.log(`[GET] Se cer capturile pentru User ID: ${userId}`);
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

// Șterge o locație
app.delete('/api/spots/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM fishing_spots WHERE id = $1", [id]);
        res.json({ message: "Locație ștearsă!" });
    } catch (err) {
        console.error("Eroare ștergere spot:", err);
        res.status(500).send("Eroare server");
    }
});

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

app.post('/api/send-code', async (req, res) => {
    try {
        const { email, nume } = req.body;
        
        if (!email || !nume) {
            return res.status(400).json({ message: "Numele și Emailul sunt obligatorii!" });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Email invalid! (ex: nume@domeniu.com)" });
        }

        const checkName = await pool.query("SELECT * FROM users WHERE nume = $1", [nume]);
        if (checkName.rows.length > 0) {
            return res.status(409).json({ message: "Acest nume de utilizator este deja luat!" });
        }

        const checkEmail = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(409).json({ message: "Există deja un cont cu acest email!" });
        }

        const cod = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);
        await pool.query("INSERT INTO verification_codes (email, code) VALUES ($1, $2)", [email, cod]);

        const mailOptions = {
            from: 'Fishing App <noreply@fishingapp.com>',
            to: email,
            subject: 'Codul tău de verificare',
            text: `Salut ${nume}! Codul tău este: ${cod}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Eroare mail:", error);
                return res.status(500).json({ message: "Nu am putut trimite emailul." });
            }
            res.json({ message: "Cod trimis cu succes!" });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Eroare server" });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { nume, email, password, code } = req.body;

        if (!nume || !email || !password || !code) {
            return res.status(400).json({ message: "Date incomplete!" });
        }

        const checkName = await pool.query("SELECT * FROM users WHERE nume = $1", [nume]);
        if (checkName.rows.length > 0) {
            return res.status(409).json({ message: "Acest nume este deja luat!" });
        }

        const codeCheck = await pool.query(
            "SELECT * FROM verification_codes WHERE email = $1 AND code = $2", 
            [email, code]
        );

        if (codeCheck.rows.length === 0) {
            return res.status(400).json({ message: "Cod incorect sau expirat!" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await pool.query(
            "INSERT INTO users (nume, email, password) VALUES ($1, $2, $3) RETURNING *",
            [nume, email, hashedPassword]
        );

        await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [newUser.rows[0].id]);
        await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);

        res.status(201).json({ success: true, user: newUser.rows[0] });

    } catch (err) {
        console.error("Eroare register:", err.message);
        res.status(500).json({ message: "Eroare server" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Email sau parolă incorectă!" });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Email sau parolă incorectă!" });
        }

        const profileCheck = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
        if (profileCheck.rows.length === 0) {
            await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [user.id]);
        }

        res.json({ success: true, user: user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Eroare server");
    }
});

app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  res.json(result.rows[0] || null);
});

app.put('/api/capturi/:id/publish', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE capturi SET is_public = TRUE WHERE id = $1", [id]);
        res.json({ message: "Captura a fost postată în Feed!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

app.get('/api/feed', async (req, res) => {
    try {
        const userId = req.query.userId || 0;

        const feedQuery = `
            SELECT 
                c.id, 
                c.specie, 
                c.lungime, 
                c.detalii, 
                c.poza_url, 
                c.created_at,
                u.nume as pescar_nume,
                p.avatar_url as pescar_avatar,
                
                -- Număr Like-uri
                (SELECT COUNT(*) FROM likes WHERE captura_id = c.id)::int as likes_count,
                
                -- Verificăm dacă userul curent a dat like (TRUE/FALSE)
                EXISTS(SELECT 1 FROM likes WHERE captura_id = c.id AND user_id = $1) as liked_by_current_user,
                
                -- Număr Comentarii
                (SELECT COUNT(*) FROM comments WHERE captura_id = c.id)::int as comments_count,

                -- Lista Comentariilor (JSON array)
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'id', com.id,
                        'text', com.text,
                        'user_name', cu.nume,
                        'user_avatar', cp.avatar_url,
                        'created_at', com.created_at
                    ) ORDER BY com.created_at ASC)
                    FROM comments com
                    JOIN users cu ON com.user_id = cu.id
                    LEFT JOIN profiles cp ON cu.id = cp.user_id
                    WHERE com.captura_id = c.id
                    ), '[]'
                ) as comments,

                -- Lista Tag-urilor (JSON array) - folosind tabela de legătură catch_tags
                COALESCE(
                    (SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
                     FROM catch_tags ct
                     JOIN tags t ON ct.tag_id = t.id
                     WHERE ct.captura_id = c.id
                    ), '[]'
                ) as tags

            FROM capturi c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE c.is_public = TRUE
            ORDER BY c.created_at DESC
        `;
        
        const result = await pool.query(feedQuery, [userId]);
        res.json(result.rows);

    } catch (err) {
        console.error("Eroare feed:", err);
        res.status(500).send("Eroare server la feed");
    }
});

app.post('/api/capturi/:id/like', async (req, res) => {
    try {
        const user_id = req.body.userId || req.body.user_id; 
        const { id } = req.params;

        if (!user_id) {
            return res.status(400).json({ message: "Lipseste ID-ul utilizatorului!" });
        }

        const check = await pool.query("SELECT * FROM likes WHERE user_id = $1 AND captura_id = $2", [user_id, id]);

        if (check.rows.length > 0) {
            await pool.query("DELETE FROM likes WHERE user_id = $1 AND captura_id = $2", [user_id, id]);
            res.json({ message: "Dislike", status: 'removed' });
        } else {
            await pool.query("INSERT INTO likes (user_id, captura_id) VALUES ($1, $2)", [user_id, id]);
            res.json({ message: "Like", status: 'added' });
        }
    } catch (err) {
        console.error("Eroare like:", err);
        res.status(500).send("Eroare server");
    }
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