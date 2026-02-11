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
const axios = require('axios');
const cheerio = require('cheerio');
const SunCalc = require('suncalc');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'fishingapp26@gmail.com', // ⚠️ PUNE EMAILUL TĂU AICI
        pass: 'pzsz kgew vyay rzaz' // ⚠️ PUNE CODUL TĂU DE 16 LITERE AICI
    }
});
app.use(cors());
app.use(express.json());

// CHEIA TA DE LA OPENWEATHER (Înlocuiește aici!)
const WEATHER_API_KEY = '4e601c4c3d6087a80b417fac765f2aaa'; 

// Funcție ajutătoare: Calculează scorul bazat pe presiune
function calculateScore(weather, date, lat, long) {
    // --- 1. LUNĂ & SOLUNAR (30% din total) ---
    // Soarele și Luna sunt factori critici. "Tranzitul" este echivalentul "Major Time" din aplicații.
    const moonIllum = SunCalc.getMoonIllumination(date);
    const moonTimes = SunCalc.getMoonTimes(date, lat, long);
    
    // A. Faza Lunii (Baza)
    const distFromFull = Math.abs(0.5 - moonIllum.phase);
    let moonScore = 50; // Pornim de la mediu
    
    if (distFromFull < 0.1) moonScore = 95;      // Lună Plină (Foarte Activ)
    else if (moonIllum.phase < 0.1 || moonIllum.phase > 0.9) moonScore = 100; // Lună Nouă (Excelent - întuneric total)
    else if (distFromFull < 0.25) moonScore = 70; // Primul/Ultimul Pătrar
    else moonScore = 40; // Alte faze intermediare

    // B. Momente Solunare (Bonusuri)
    const currentHour = date.getHours();
    
    // Perioade MINORE (Răsărit / Apus) - Durată aprox 1h
    // Verificăm fereastra de +/- 1 oră
    if (moonTimes.rise && Math.abs(moonTimes.rise.getHours() - currentHour) <= 1) moonScore += 15;
    if (moonTimes.set && Math.abs(moonTimes.set.getHours() - currentHour) <= 1) moonScore += 15;

    // Perioade MAJORE (Tranzit - Luna sus) - Durată aprox 2h - CEL MAI IMPORTANT
    // Fishing Points pune mare preț pe asta. 'transit' e momentul când luna e cel mai sus (Zenit).
    if (moonTimes.transit) {
        const transitHour = moonTimes.transit.getHours();
        // Fereastră mai largă (+/- 2 ore) pentru momentul major
        if (Math.abs(transitHour - currentHour) <= 2) {
            moonScore += 25; // Bonus Masiv
        }
    }

    // Limităm scorul lunii la 100 (ca să nu iasă din grafic)
    moonScore = Math.min(moonScore, 100);


    // --- 2. PRESIUNE ATMOSFERICĂ (35% din total) ---
    // Ideal: 1012-1018 hPa (Stabilă sau în ușoară scădere).
    const p = weather.main.pressure;
    let pressureScore = 50;

    if (p >= 1012 && p <= 1018) pressureScore = 100; // Perfect
    else if (p >= 1005 && p < 1012) pressureScore = 85; // Acceptabil (presiune joasă, adesea înainte de furtună - peștele mănâncă)
    else if (p > 1018 && p <= 1025) pressureScore = 70; // Presiune mare (front rece, cer senin, dar peștele poate fi apatic)
    else pressureScore = 30; // Extreme (furtună mare sau presiune uriașă)


    // --- 3. TEMPERATURĂ (20% din total) ---
    // Ideal general: 12-25°C. 
    // Notă: Aici ideal ar fi temperatura APEI, dar folosim aerul ca aproximare.
    const t = weather.main.temp;
    let tempScore = 50;
    
    if (t >= 15 && t <= 24) tempScore = 100;
    else if (t >= 10 && t < 15) tempScore = 80; // Puțin rece, dar ok pt răpitor
    else if (t > 24 && t <= 30) tempScore = 70; // Prea cald, peștele stă la fund
    else if (t < 5 || t > 32) tempScore = 20;   // Extreme


    // --- 4. VÂNT (15% din total) ---
    // Ideal: Briză ușoară (vântul oxigenează apa). Vântul 0 e uneori rău (apă stătută).
    const w = weather.wind.speed * 3.6; // m/s -> km/h
    let windScore = 50;

    if (w > 2 && w <= 12) windScore = 100; // Briză perfectă (valuri mici)
    else if (w >= 0 && w <= 2) windScore = 80; // Calm total (ok, dar uneori peștele e precaut)
    else if (w > 12 && w <= 25) windScore = 60; // Vânt măricel (pescuit dificil)
    else windScore = 20; // Furtună/Vânt puternic


    // --- CALCUL FINAL PONDERAT ---
    let final = (pressureScore * 0.35) + (moonScore * 0.30) + (tempScore * 0.20) + (windScore * 0.15);
    
    return Math.min(Math.round(final), 100);
}

const AFDJ_STATIONS = [
    { name: "Bazias", lat: 44.81, lng: 21.39 },
    { name: "Drencova", lat: 44.63, lng: 21.98 },
    { name: "Orsova", lat: 44.72, lng: 22.39 },
    { name: "Tr. Severin", lat: 44.63, lng: 22.65 }, // Drobeta
    { name: "Gruia", lat: 44.26, lng: 22.70 },
    { name: "Calafat", lat: 43.99, lng: 22.93 },
    { name: "Bechet", lat: 43.79, lng: 23.95 },
    { name: "Corabia", lat: 43.77, lng: 24.50 },
    { name: "Tr. Magurele", lat: 43.75, lng: 24.87 },
    { name: "Zimnicea", lat: 43.66, lng: 25.36 },
    { name: "Giurgiu", lat: 43.89, lng: 25.96 },
    { name: "Oltenita", lat: 44.08, lng: 26.63 },
    { name: "Calarasi", lat: 44.19, lng: 27.33 },
    { name: "Cernavoda", lat: 44.33, lng: 28.03 },
    { name: "Harsova", lat: 44.69, lng: 27.95 },
    { name: "Braila", lat: 45.27, lng: 27.97 },
    { name: "Galati", lat: 45.43, lng: 28.03 },
    { name: "Isaccea", lat: 45.26, lng: 28.46 },
    { name: "Tulcea", lat: 45.18, lng: 28.80 }
];

function getClosestStation(lat, lng) {
    let closest = null;
    let minDist = Infinity;

    AFDJ_STATIONS.forEach(station => {
        const dist = Math.sqrt(Math.pow(station.lat - lat, 2) + Math.pow(station.lng - lng, 2));
        if (dist < minDist) {
            minDist = dist;
            closest = station;
        }
    });
    return closest;
}

app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Emailul este obligatoriu!" });
        }

        // A. Verificăm dacă userul există (Nu trimitem cod dacă nu are cont)
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: "Nu există cont cu acest email." });
        }

        const cod = Math.floor(100000 + Math.random() * 900000).toString();

        // B. Curățăm codurile vechi (exact ca la register/send-code)
        await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);

        // C. Inserăm noul cod
        // NOTĂ: Dacă la register îți merge fără ID, înseamnă că acolo merge. 
        // Dacă totuși aici crapă, e din cauza diferenței de tabel, dar încercăm varianta standard întâi.
        await pool.query("INSERT INTO verification_codes (email, code) VALUES ($1, $2)", [email, cod]);

        // D. Trimitem Email
        const mailOptions = {
            from: 'Fishing App <noreply@fishingapp.com>',
            to: email,
            subject: 'Resetare Parolă',
            text: `Salut! Codul tău de resetare este: ${cod}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Eroare mail:", error);
                return res.status(500).json({ message: "Eroare la trimiterea emailului." });
            }
            res.json({ message: "Codul a fost trimis pe email!" });
        });

    } catch (err) {
        console.error("Eroare forgot-password:", err);
        res.status(500).json({ message: "Eroare server" });
    }
});

// 2. VERIFICĂ COD ȘI SCHIMBĂ PAROLA
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: "Toate câmpurile sunt obligatorii!" });
        }

        // A. Verificăm codul în tabelul verification_codes
        const codeCheck = await pool.query(
            "SELECT * FROM verification_codes WHERE email = $1 AND code = $2", 
            [email, code]
        );

        if (codeCheck.rows.length === 0) {
            return res.status(400).json({ message: "Cod incorect sau expirat!" });
        }

        // B. Hashuim parola nouă
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // C. Actualizăm parola utilizatorului
        await pool.query(
            "UPDATE users SET password = $1 WHERE email = $2",
            [hashedPassword, email]
        );

        // D. Ștergem codul folosit
        await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);

        res.json({ success: true, message: "Parola a fost schimbată cu succes!" });

    } catch (err) {
        console.error("Eroare reset-confirm:", err);
        res.status(500).json({ message: "Eroare server" });
    }
});

app.post('/api/forecast', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        const targetStation = getClosestStation(latitude, longitude);
        console.log(`Utilizatorul e lângă: ${targetStation.name}`);

        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${WEATHER_API_KEY}`;
        const response = await axios.get(url);
        const list = response.data.list;

        // --- SCRAPING AFDJ AVANSAT (Prognoza 5 Zile) ---
        let stationName = targetStation.name;
        let currentLevel = 0; // Nivelul de azi
        let currentVar = 0;   // Variația de azi
        let forecastLevels = []; // Aici vom pune [Val24H, Val48H, Val72H, Val96H, Val120H]
        let dataAvailable = false;

        try {
            const headers = { 'User-Agent': 'Mozilla/5.0' };
            const afdjRes = await axios.get('https://www.afdj.ro/ro/cotele-dunarii', { headers, timeout: 4000 });
            const $ = cheerio.load(afdjRes.data);
            
            $('tbody tr').each((i, row) => {
                const text = $(row).text().trim();
                
                // Căutăm stația noastră
                if (text.toLowerCase().includes(targetStation.name.toLowerCase())) {
                    dataAvailable = true;
                    const tds = $(row).find('td');

                    // 1. Extragem Nivelul Curent (Coloana 2 - index 2)
                    currentLevel = parseInt($(tds[2]).text().trim());

                    // 2. Extragem Variația Curentă (Coloana 3 - index 3)
                    // Curățăm textul gen "+ 6" sau "6"
                    const varText = $(tds[3]).text().trim().match(/([+-]?\s?\d+)/);
                    if (varText) currentVar = parseInt(varText[0].replace(/\s/g, ''));

                    // 3. Extragem Prognozele (Coloanele 6, 7, 8, 9, 10 corespund la 24H...120H)
                    // Verifică imaginea ta: 24H este a 7-a coloană vizuală (index 6 în array 0-indexed)
                    // Indexii sunt: 6(24H), 7(48H), 8(72H), 9(96H), 10(120H)
                    for (let j = 6; j <= 10; j++) {
                        const val = parseInt($(tds[j]).text().trim());
                        forecastLevels.push(isNaN(val) ? currentLevel : val); // Fallback la current dacă e gol
                    }
                    
                    return false; // Stop loop
                }
            });
        } catch (e) {
            console.log("Eroare AFDJ:", e.message);
        }

        // --- GRUPARE DATE ---
        const daysMap = {};
        
        // Un contor ca să știm a câta zi unică procesăm (0=Azi, 1=Maine...)
        let dayIndexCounter = -1; 
        let lastProcessedDate = "";

        list.forEach(item => {
            const dateObj = new Date(item.dt * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];
            const hour = dateObj.getHours() + ":00";
            const moonIllum = SunCalc.getMoonIllumination(dateObj);
            
            // Verificăm dacă am trecut la o zi nouă pentru a incrementa indexul
            if (dateKey !== lastProcessedDate) {
                dayIndexCounter++;
                lastProcessedDate = dateKey;
            }

            // --- CALCUL VARIAȚIE APĂ PENTRU ZIUA ASTA ---
            let dailyWaterVar = 0;
            let dailyWaterLevel = 0;
            let waterScore = 50; // Default

            if (dataAvailable) {
                if (dayIndexCounter === 0) {
                    // AZI: Folosim datele curente
                    dailyWaterLevel = currentLevel;
                    dailyWaterVar = currentVar;
                } else if (dayIndexCounter > 0 && dayIndexCounter <= 5) {
                    // ZILELE URMATOARE (1..5):
                    // Nivelul prognozat pentru ziua curentă (index - 1 pt că array-ul începe de la 24H)
                    const predictedLevel = forecastLevels[dayIndexCounter - 1]; 
                    
                    // Nivelul zilei anterioare (ca să calculăm variația)
                    const previousLevel = dayIndexCounter === 1 ? currentLevel : forecastLevels[dayIndexCounter - 2];
                    
                    dailyWaterLevel = predictedLevel;
                    dailyWaterVar = predictedLevel - previousLevel; // Variația față de ieri
                }
                
                // Calcul Scored Apă
                if (dailyWaterVar > 0 && dailyWaterVar <= 10) waterScore = 100; // Creștere ușoară
                else if (dailyWaterVar === 0) waterScore = 80; // Staționar
                else if (dailyWaterVar > 10) waterScore = 60; // Creștere mare
                else if (dailyWaterVar < 0 && dailyWaterVar >= -5) waterScore = 70; // Scădere mică
                else waterScore = 40; // Scădere mare
            }

            // Calculăm scorul Meteo
            let baseScore = calculateScore(item, dateObj, latitude, longitude);
            
            // Scor Final (85% Meteo + 15% Apa)
            let finalHourlyScore = baseScore;
            if (dataAvailable) {
                finalHourlyScore = Math.round((baseScore * 0.85) + (waterScore * 0.15));
            }

            if (!daysMap[dateKey]) {
                daysMap[dateKey] = {
                    date: dateKey,
                    dayName: dateObj.toLocaleDateString('ro-RO', { weekday: 'long' }),
                    totalScore: 0,
                    count: 0,
                    hourlyData: [],
                    rawPressure: 0,
                    rawWind: 0,
                    moonPhaseVal: moonIllum.phase,
                    // Salvăm datele despre apă specifice acestei zile
                    waterInfo: {
                        station: stationName,
                        level: dailyWaterLevel,
                        variation: dailyWaterVar,
                        available: dataAvailable
                    }
                };
            }

            daysMap[dateKey].totalScore += finalHourlyScore;
            daysMap[dateKey].count++;
            daysMap[dateKey].rawPressure += item.main.pressure;
            daysMap[dateKey].rawWind += item.wind.speed;

            daysMap[dateKey].hourlyData.push({
                time: hour,
                score: finalHourlyScore,
                temp: Math.round(item.main.temp),
                icon: item.weather[0].icon,
                desc: item.weather[0].description
            });
        });

        const finalForecast = Object.values(daysMap).map(day => {
            const avgScore = Math.round(day.totalScore / day.count);
            const avgPressure = Math.round(day.rawPressure / day.count);
            const avgWind = (day.rawWind / day.count * 3.6).toFixed(1);

            let moonText = "În Creștere";
            if (day.moonPhaseVal < 0.1 || day.moonPhaseVal > 0.9) moonText = "Lună Nouă";
            else if (day.moonPhaseVal > 0.4 && day.moonPhaseVal < 0.6) moonText = "Lună Plină";
            else if (day.moonPhaseVal < 0.5) moonText = "Primul Pătrar";
            else moonText = "Ultimul Pătrar";

            return {
                ...day,
                averageScore: avgScore,
                verdict: avgScore > 75 ? "Excelent" : (avgScore > 50 ? "Bun" : "Slab"),
                details: {
                    // Structurăm datele frumos pentru frontend
                    waterLevel: day.waterInfo.level,
                    waterVariation: day.waterInfo.variation,
                    stationName: day.waterInfo.station,
                    avgPressure: avgPressure,
                    avgWind: avgWind,
                    moonText: moonText
                }
            };
        });

        res.json(finalForecast.slice(0, 5));

    } catch (err) {
        console.error("Eroare forecast:", err.message);
        res.status(500).json({ message: "Eroare server" });
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
        const requesterId = req.query.adminId;

        const captureCheck = await pool.query("SELECT user_id, specie FROM capturi WHERE id = $1", [id]);
        
        if (captureCheck.rows.length === 0) {
            return res.status(404).json({ message: "Captura nu există." });
        }

        const ownerId = captureCheck.rows[0].user_id;
        const specie = captureCheck.rows[0].specie;

        await pool.query("DELETE FROM capturi WHERE id = $1", [id]);

        if (requesterId && parseInt(requesterId) !== ownerId) {
            const message = `⚠️ Administratorul a șters postarea ta cu captura "${specie}" deoarece încălca regulamentul comunității.`;
            
            await pool.query(
                "INSERT INTO notifications (user_id, message) VALUES ($1, $2)", 
                [ownerId, message]
            );
        }

        res.json({ message: "Captura ștearsă și utilizatorul a fost notificat (dacă a fost cazul)." });

    } catch (err) {
        console.error("Eroare ștergere:", err);
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

        // --- NOU: VERIFICĂM DACĂ ARE NOTIFICĂRI ---
        const notifications = await pool.query("SELECT message FROM notifications WHERE user_id = $1", [user.id]);
        
        // Dacă are notificări, le ștergem din baza de date ca să nu apară la infinit
        if (notifications.rows.length > 0) {
            await pool.query("DELETE FROM notifications WHERE user_id = $1", [user.id]);
        }

        // Trimitem userul + lista de mesaje (dacă există)
        res.json({ 
            success: true, 
            user: user, 
            notifications: notifications.rows // Array cu mesaje
        });

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
                c.user_id,  -- <--- AM ADĂUGAT ASTA AICI. Fără el nu mergea click-ul!
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

                -- Lista Tag-urilor (JSON array)
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

app.get('/api/users/:id/full-profile', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Luăm datele de bază ale userului
        const userRes = await pool.query(
            "SELECT id, nume FROM users WHERE id = $1", 
            [id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: "Utilizator negăsit" });
        }

        // 2. Luăm profilul (avatarul)
        const profileRes = await pool.query(
            "SELECT avatar_url, bio FROM profiles WHERE user_id = $1", 
            [id]
        );

        // 3. Luăm DOAR capturile PUBLICE ale acestui user
        const capturiRes = await pool.query(
            `SELECT id, specie, lungime, detalii, poza_url, created_at 
             FROM capturi 
             WHERE user_id = $1 AND is_public = TRUE 
             ORDER BY created_at DESC`, 
            [id]
        );

        // Construim obiectul final pe care îl trimitem la Angular
        res.json({
            user: userRes.rows[0],
            profile: profileRes.rows[0] || { avatar_url: null, bio: "Fără descriere." },
            capturi: capturiRes.rows
        });

    } catch (err) {
        // Această eroare va apărea în consola Docker (server-1 | ...)
        console.error("❌ EROARE SQL LA PROFIL:", err.message); 
        res.status(500).json({ error: "Eroare la server", details: err.message });
    }
});

// --- 2. SISTEM PRIETENIE ---

// Verifică statusul relației dintre 2 useri
app.get('/api/friends/status', async (req, res) => {
    const { u1, u2 } = req.query;
    try {
        // Căutăm orice relație între ei (indiferent cine a cerut)
        const rel = await pool.query(
            `SELECT * FROM friendships 
             WHERE (requester_id = $1 AND addressee_id = $2) 
                OR (requester_id = $2 AND addressee_id = $1)`,
            [u1, u2]
        );
        res.json(rel.rows[0] || { status: 'none' });
    } catch (err) { res.status(500).send(err.message); }
});
// --- ACEASTA ESTE RUTA CARE LIPSEA ---
app.post('/api/friends/request', async (req, res) => {
    try {
        const { requesterId, addresseeId } = req.body;

        if (!requesterId || !addresseeId) {
            return res.status(400).json({ message: "ID-urile sunt obligatorii!" });
        }

        // Verificăm să nu existe deja o cerere sau prietenie
        const check = await pool.query(
            "SELECT * FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)",
            [requesterId, addresseeId]
        );

        if (check.rows.length > 0) {
            return res.status(409).json({ message: "Cererea există deja!" });
        }

        await pool.query(
            "INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'pending')",
            [requesterId, addresseeId]
        );

        res.json({ success: true, message: "Cerere trimisă!" });
    } catch (err) {
        console.error("Eroare friend request:", err.message);
        res.status(500).send(err.message);
    }
});
// Trimite cerere
app.get('/api/friends/requests/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT f.id as friendship_id, u.id as user_id, u.nume, p.avatar_url 
            FROM friendships f
            JOIN users u ON f.requester_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE f.addressee_id = $1 AND f.status = 'pending'
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});
// Acceptă cerere
// 2. Acceptă sau Refuză o cerere
app.put('/api/friends/respond', async (req, res) => {
    try {
        const { friendshipId, status } = req.body; // 'accepted' sau 'declined'
        if (status === 'declined') {
            await pool.query("DELETE FROM friendships WHERE id = $1", [friendshipId]);
        } else {
            await pool.query("UPDATE friendships SET status = 'accepted' WHERE id = $1", [friendshipId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).send(err.message);
    }
});
// --- 3. CHAT ---

// Ia mesajele dintre 2 useri
app.get('/api/messages/:otherUserId', async (req, res) => {
    const { otherUserId } = req.params;
    const myId = req.query.myId;
    try {
        const msgs = await pool.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) 
                OR (sender_id = $2 AND receiver_id = $1)
             ORDER BY created_at ASC`,
            [myId, otherUserId]
        );
        res.json(msgs.rows);
    } catch (err) { res.status(500).send(err.message); }
});
app.get('/api/friends/suggestions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT u.id, u.nume, p.avatar_url, p.bio 
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id != $1 
            AND u.id NOT IN (
                SELECT requester_id FROM friendships WHERE addressee_id = $1
                UNION
                SELECT addressee_id FROM friendships WHERE requester_id = $1
            )
            LIMIT 6;
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// În index.js
app.delete('/api/friends/unfriend/:myId/:friendId', async (req, res) => {
    try {
        const { myId, friendId } = req.params;
        
        // Ștergem relația în ambele sensuri posibile
        await pool.query(
            `DELETE FROM friendships 
             WHERE (requester_id = $1 AND addressee_id = $2) 
                OR (requester_id = $2 AND addressee_id = $1)`,
            [myId, friendId]
        );
        
        res.json({ success: true, message: "Prietenie ștearsă" });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});
// A. Vezi cererile TRIMISE de mine (Pending)
app.get('/api/friends/sent/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT f.id as friendship_id, u.id as user_id, u.nume, p.avatar_url 
            FROM friendships f
            JOIN users u ON f.addressee_id = u.id  -- Luăm datele CELUILALT (destinatarul)
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE f.requester_id = $1 AND f.status = 'pending'
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// B. Anulează o cerere trimisă (Șterge după ID-ul prieteniei)
app.delete('/api/friends/cancel/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM friendships WHERE id = $1", [id]);
        res.json({ message: "Cerere anulată" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// C. Lista de PRIETENI (Acceptați)
app.get('/api/friends/list/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // Această interogare e puțin mai complexă pentru că prietenia poate fi în ambele sensuri
        const query = `
            SELECT 
                CASE 
                    WHEN requester_id = $1 THEN addressee_id 
                    ELSE requester_id 
                END as id,
                f.id as friendship_id
            FROM friendships f
            WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
        `;
        
        // Luăm ID-urile prietenilor, apoi le luăm numele și pozele
        const friendsIdsRes = await pool.query(query, [userId]); // Deoarece $1 este număr, query-ul trebuie adaptat ușor în JS sau SQL direct
        // Varianta SQL directă și curată:
        const fullQuery = `
            SELECT u.id, u.nume, p.avatar_url, p.bio
            FROM users u
            JOIN friendships f ON (f.requester_id = u.id OR f.addressee_id = u.id)
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE (f.requester_id = $1 OR f.addressee_id = $1) 
            AND f.status = 'accepted' 
            AND u.id != $1
        `;
        
        const result = await pool.query(fullQuery, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});
// --- A. CĂUTARE UTILIZATORI (Global) ---
app.get('/api/users/search', async (req, res) => {
    try {
        const { query } = req.query; // ex: ?query=Ion
        if (!query) return res.json([]);

        const result = await pool.query(`
            SELECT u.id, u.nume, p.avatar_url 
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.nume ILIKE $1 
            LIMIT 5`, 
            [`%${query}%`] // Căutare parțială (case-insensitive)
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- B. LISTA DE CONVERSAȚII ACTIVE ---
// Această interogare returnează lista utilizatorilor cu care ai vorbit, ordonată după ultimul mesaj
app.get('/api/messages/conversations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const query = `
            SELECT DISTINCT ON (partner_id)
                CASE 
                    WHEN sender_id = $1 THEN receiver_id 
                    ELSE sender_id 
                END as partner_id,
                u.nume,
                p.avatar_url,
                m.message as last_message,
                m.created_at
            FROM messages m
            JOIN users u ON u.id = (CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END)
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE sender_id = $1 OR receiver_id = $1
            ORDER BY partner_id, m.created_at DESC
        `;
        
        // Notă: SQL-ul de mai sus ia ultimul mesaj per partener. 
        // Apoi, în frontend sau printr-un wrapper SQL, le poți sorta după 'created_at' global.
        
        const result = await pool.query(query, [userId]);
        
        // Le sortăm în JS ca să fim siguri că cele mai recente sunt primele
        const sorted = result.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json(sorted);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});
// Trimite mesaj
app.post('/api/messages', async (req, res) => {
    const { senderId, receiverId, text } = req.body;
    try {
        const newMsg = await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *",
            [senderId, receiverId, text]
        );
        res.json(newMsg.rows[0]);
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Cale Uploads configurată la: ${uploadDir}`);
});

app.post('/api/reports', upload.single('poza'), async (req, res) => {
    try {
        const { userId, latitude, longitude, locationText, description, date } = req.body;
        
        // 1. Gestionăm poza
        let photoUrl = null;
        if (req.file) {
            photoUrl = 'uploads/' + req.file.filename;
        }

        // 2. Curățăm datele (userId poate veni ca string "null")
        const finalUserId = (userId && userId !== 'null' && !isNaN(userId)) ? userId : null;

        // 3. Salvăm în baza de date (inclusiv photo_url)
        // ATENȚIE: Asigură-te că ai coloana 'photo_url' în tabelul reports!
        // Dacă nu o ai, rulează în SQL: ALTER TABLE reports ADD COLUMN photo_url VARCHAR(255);
        const newReport = await pool.query(
            `INSERT INTO reports (user_id, latitude, longitude, location_text, description, date_incident, photo_url, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
            [finalUserId, latitude, longitude, locationText, description, date, photoUrl]
        );
        
        res.json(newReport.rows[0]);
    } catch (err) {
        console.error("Eroare salvare raport:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
});

// 2. CITIRE RAPOARTE (Admin)
app.get('/api/reports', async (req, res) => {
    try {
        // Luăm rapoartele + numele celui care a raportat (dacă există)
        const allReports = await pool.query(`
            SELECT reports.*, users.nume as reporter_name 
            FROM reports 
            LEFT JOIN users ON reports.user_id = users.id 
            ORDER BY created_at DESC
        `);
        res.json(allReports.rows);
    } catch (err) {
        console.error("Eroare citire rapoarte:", err.message);
        res.status(500).send("Server Error");
    }
});

// 3. ACTUALIZARE STATUS (Admin)
app.put('/api/reports/:id', async (req, res) => {
    try {
        const { status } = req.body; // 'verified' sau 'rejected'
        const { id } = req.params;
        
        await pool.query("UPDATE reports SET status = $1 WHERE id = $2", [status, id]);
        res.json({ message: "Status actualizat!" });
    } catch (err) {
        console.error("Eroare update status:", err.message);
        res.status(500).send("Server Error");
    }
});