const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const FormData = require('form-data');
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

// CHEIA TA DE LA OPENWEATHER (Înlocuiește aici!)
const WEATHER_API_KEY = '4e601c4c3d6087a80b417fac765f2aaa'; 

// Funcție ajutătoare: Calculează scorul bazat pe presiune
// Funcție nouă bazată pe Formula Multiplicativă din PDF
function calculateScore(weather, date, lat, long) {
    const moonIllum = SunCalc.getMoonIllumination(date);
    const moonTimes = SunCalc.getMoonTimes(date, lat, long);
    const sunTimes = SunCalc.getTimes(date, lat, long);
    const currentHour = date.getHours();

    // --- A. ASTRONOMIC (Baza) ---
    // 1. Valoarea Solunară (V_sol) -> Major=1.0, Minor=0.5, Bază=0.1
    let v_sol = 0.1;
    
    // Verificăm Tranzitul (Major) - Fereastră +/- 1.5 ore
    if (moonTimes.transit) {
        const transitH = moonTimes.transit.getHours();
        if (Math.abs(transitH - currentHour) <= 1.5) v_sol = 1.0;
    }
    
    // Verificăm Răsărit/Apus Lună (Minor) - Fereastră +/- 1 oră (dacă nu e deja Major)
    if (v_sol === 0.1) {
        if ((moonTimes.rise && Math.abs(moonTimes.rise.getHours() - currentHour) <= 1) ||
            (moonTimes.set && Math.abs(moonTimes.set.getHours() - currentHour) <= 1)) {
            v_sol = 0.5;
        }
    }

    // 2. Coeficientul Lunii (C_luna) -> Nouă/Plină=1.0, Pătrar=0.6, Restul=0.8
    let c_luna = 0.8;
    const phase = moonIllum.phase; 
    const distFromFull = Math.abs(0.5 - phase);

    if (phase < 0.1 || phase > 0.9) c_luna = 1.0; // Lună Nouă (Cea mai bună)
    else if (distFromFull < 0.1) c_luna = 1.0;    // Lună Plină
    else if (distFromFull < 0.25 && distFromFull > 0.20) c_luna = 0.6; // Pătrar
    
    // 3. Bonus Solar (B_solar)
    let b_solar = 0.0;
    const sunriseH = sunTimes.sunrise.getHours();
    const sunsetH = sunTimes.sunset.getHours();

    // Zori/Amurg (+0.4) doar dacă se suprapune cu activitate solunară
    if (Math.abs(currentHour - sunriseH) <= 1 || Math.abs(currentHour - sunsetH) <= 1) {
        if (v_sol > 0.1) b_solar = 0.4;
    } else if (currentHour >= 11 && currentHour <= 14) {
        b_solar = 0.1; // Miezul zilei
    }

    let baseAstronomical = v_sol + c_luna + b_solar;

    // --- B. MODULATOR BAROMETRIC (M_baro) ---
    // Scădere lentă (1002-1014)=1.2 | Stabil=1.0 | Creștere rapidă(>1022)=0.5
    const p = weather.main.pressure;
    let m_baro = 1.0; 

    if (p >= 1002 && p <= 1014) m_baro = 1.2; // Ideal (scădere ușoară)
    else if (p > 1014 && p <= 1022) m_baro = 1.0; // Stabil
    else if (p > 1022) m_baro = 0.5; // Presiune mare/creștere (Slab)
    else if (p < 1000) m_baro = 0.8; // Furtună (Mediocru)

    // --- C. FILTRE DE SIGURANȚĂ (Temperatura & Vânt) ---
    let safetyMultiplier = 1.0;
    
    const t = weather.main.temp;
    if (t < 4) safetyMultiplier *= 0.3; // Iarnă grea (Metabolism 0)
    else if (t > 32) safetyMultiplier *= 0.6; // Caniculă

    const windKmh = weather.wind.speed * 3.6;
    if (windKmh > 25) safetyMultiplier *= 0.2; // Furtună/Vânt tare (Strică tot)
    else if (windKmh > 15) safetyMultiplier *= 0.8;

    // Calculăm scorul intermediar (fără apă)
    return baseAstronomical * m_baro * safetyMultiplier;
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

        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: "Nu există cont cu acest email." });
        }

        const cod = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);
        await pool.query("INSERT INTO verification_codes (email, code) VALUES ($1, $2)", [email, cod]);

        // --- NOU: ȘTERGERE AUTOMATĂ DUPĂ 2 MINUTE ---
        setTimeout(async () => {
            try {
                const result = await pool.query("DELETE FROM verification_codes WHERE email = $1 AND code = $2", [email, cod]);
                if (result.rowCount > 0) {
                    console.log(`[CLEANUP] Codul de resetare pentru ${email} a expirat și a fost șters.`);
                }
            } catch (err) {
                console.error("Eroare la ștergerea automată a codului:", err.message);
            }
        }, 2 * 60 * 1000); // 120.000 milisecunde (2 minute)

        const mailOptions = {
            from: 'Fishing App <noreply@fishingapp.com>',
            to: email,
            subject: 'Resetare Parolă',
            text: `Salut! Codul tău de resetare este: ${cod}. Codul expiră în 2 minute.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Eroare mail:", error);
                return res.status(500).json({ message: "Eroare la trimiterea emailului." });
            }
            res.json({ message: "Codul a fost trimis pe email! (Valabil 2 minute)" });
        });

    } catch (err) {
        console.error("Eroare forgot-password:", err);
        res.status(500).json({ message: "Eroare server" });
    }
});


app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: "Toate câmpurile sunt obligatorii!" });
        }

      
        const codeCheck = await pool.query(
            "SELECT * FROM verification_codes WHERE email = $1 AND code = $2", 
            [email, code]
        );

        if (codeCheck.rows.length === 0) {
            return res.status(400).json({ message: "Cod incorect sau expirat!" });
        }

     
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);


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

        // --- SCRAPING AFDJ AVANSAT ---
        let stationName = targetStation.name;
        let currentLevel = 0; 
        let currentVar = 0;   
        let forecastLevels = []; 
        let dataAvailable = false;
        
        try {
            const headers = { 'User-Agent': 'Mozilla/5.0' };
            const afdjRes = await axios.get('https://www.afdj.ro/ro/cotele-dunarii', { headers, timeout: 4000 });
            const $ = cheerio.load(afdjRes.data);
            
            $('tbody tr').each((i, row) => {
                const text = $(row).text().trim();
                if (text.toLowerCase().includes(targetStation.name.toLowerCase())) {
                    dataAvailable = true;
                    const tds = $(row).find('td');
                    currentLevel = parseInt($(tds[2]).text().trim());
                    const varText = $(tds[3]).text().trim().match(/([+-]?\s?\d+)/);
                    if (varText) currentVar = parseInt(varText[0].replace(/\s/g, ''));
                    for (let j = 6; j <= 10; j++) {
                        const val = parseInt($(tds[j]).text().trim());
                        forecastLevels.push(isNaN(val) ? currentLevel : val);
                    }
                    return false; 
                }
            });
        } catch (e) {
            console.log("Eroare AFDJ:", e.message);
        }

        // --- PROCESARE DATE ---
        const daysMap = {};
        let dayIndexCounter = -1; 
        let lastProcessedDate = "";

        list.forEach(item => {
            const dateObj = new Date(item.dt * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];
            const hour = dateObj.getHours() + ":00";
            const moonIllum = SunCalc.getMoonIllumination(dateObj);
            
            if (dateKey !== lastProcessedDate) {
                dayIndexCounter++;
                lastProcessedDate = dateKey;
            }

            // --- 1. Determină Variația Apei (H_local Logic) ---
            let dailyWaterVar = 0;
            let dailyWaterLevel = 0;
            let h_local = 1.0; // Default factor neutru

            if (dataAvailable) {
                if (dayIndexCounter === 0) {
                    dailyWaterLevel = currentLevel;
                    dailyWaterVar = currentVar;
                } else if (dayIndexCounter > 0 && dayIndexCounter <= 5) {
                    const predictedLevel = forecastLevels[dayIndexCounter - 1]; 
                    const previousLevel = dayIndexCounter === 1 ? currentLevel : forecastLevels[dayIndexCounter - 2];
                    dailyWaterLevel = predictedLevel;
                    dailyWaterVar = predictedLevel - previousLevel;
                }
                
                // Aplicăm multiplicatorii din PDF pentru apă
                if (dailyWaterVar > 0) h_local = 1.1;       // Creștere (Bonus)
                else if (dailyWaterVar === 0) h_local = 1.0; // Stabil
                else if (dailyWaterVar < 0) h_local = 0.7;   // Scădere (Penalizare mare)
            }

            // --- 2. Calculăm Scorul Brut (Astro * Meteo) ---
            let rawScore = calculateScore(item, dateObj, latitude, longitude);
            
            // --- 3. Aplicăm Factorul Apă (Formula Finală) ---
            // IA = RawScore * H_local
            let final_IA = rawScore * h_local;

            // --- 4. Conversie în Procent (0-100) pentru UI ---
            // Un scor IA de 2.5 este considerat teoretic maximul perfect.
            let percentageScore = (final_IA / 2.5) * 100;
            
            // Plafonare la 100% și rotunjire
            if (percentageScore > 100) percentageScore = 100;
            let finalHourlyScore = Math.round(percentageScore);


            // --- SALVARE ÎN OBIECT ---
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
                verdict: avgScore > 80 ? "Excelent" : (avgScore > 60 ? "Bun" : "Slab"),
                details: {
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
        // 1. AICI AM REPARAT: Am adăugat lat și lng în extragere
        let { specie, lungime, detalii, user_id, userId, data_capturii, lat, lng } = req.body;
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

        // 2. AICI AM REPARAT: Convertim coordonatele în numere cu zecimale, sau lăsăm null dacă lipsesc
        const finalLat = lat ? parseFloat(lat) : null;
        const finalLng = lng ? parseFloat(lng) : null;

        // 3. AICI AM REPARAT: Am adăugat lat și lng în comanda SQL ($7 și $8)
        const newCatch = await pool.query(
            "INSERT INTO capturi (specie, lungime, detalii, poza_url, user_id, data_capturii, lat, lng) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [specie, lungime, detalii, pozaUrl, finalUserId, data_capturii, finalLat, finalLng]
        );
        
        console.log(`[ADD SUCCESS] Captura ID ${newCatch.rows[0].id} salvată cu locația (${finalLat}, ${finalLng})`);
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
        const { specie, lungime, detalii, lat, lng, user_id } = req.body;
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
            return res.status(400).json({ message: "Email invalid!" });
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

        // --- NOU: ȘTERGERE AUTOMATĂ DUPĂ 2 MINUTE ---
        setTimeout(async () => {
            try {
                // Ștergem codul doar dacă este același (evităm ștergerea unui cod nou dacă userul a cerut altul între timp)
                const result = await pool.query("DELETE FROM verification_codes WHERE email = $1 AND code = $2", [email, cod]);
                if (result.rowCount > 0) {
                    console.log(`[CLEANUP] Codul de înregistrare pentru ${email} a expirat și a fost șters.`);
                }
            } catch (err) {
                console.error("Eroare la ștergerea automată a codului:", err.message);
            }
        }, 2 * 60 * 1000); // 2 minute * 60 sec * 1000 ms

        const mailOptions = {
            from: 'Fishing App <noreply@fishingapp.com>',
            to: email,
            subject: 'Codul tău de verificare',
            text: `Salut ${nume}! Codul tău este: ${cod}. Acesta este valabil 2 minute.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Eroare mail:", error);
                return res.status(500).json({ message: "Nu am putut trimite emailul." });
            }
            res.json({ message: "Cod trimis cu succes! (Valabil 2 minute)" });
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

app.post('/api/check-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Te rog introdu un email." });
        }

        // Căutăm email-ul în baza de date folosind pool.query (sintaxa ta SQL)
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        // Dacă lungimea array-ului de rezultate este 0, înseamnă că nu există
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "Nu am găsit niciun cont cu acest email." });
        }

        // Dacă a găsit, trimitem mesaj de succes pentru a trece la Pasul 2 (Parolă)
        res.status(200).json({ message: "Email valid, treci la parolă." });

    } catch (err) {
        console.error("Eroare la verificarea email-ului:", err.message);
        res.status(500).json({ message: "Eroare internă de server." });
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

// --- RUTA NOUĂ: INTEGRARE AI PYTHON (IDENTIFICARE PEȘTE) ---
app.post('/api/identifica-peste', upload.single('file'), async (req, res) => {
    // Notă: În Angular am pus formData.append('file', ...), deci aici folosim 'file'
    if (!req.file) {
        return res.status(400).json({ error: 'Nu ai trimis nicio poză' });
    }

    try {
        console.log("🐟 Poză primită pentru AI, se trimite la serviciul Python...");

        // 1. Pregătim datele pentru a le trimite la containerul Python
        const formData = new FormData();
        // Citim fișierul temporar salvat de Multer și îl punem în stream
        formData.append('file', fs.createReadStream(req.file.path));

        // 2. Comunicăm cu serviciul Python prin rețeaua Docker
        // 'ai-service' este numele serviciului definit în docker-compose.yml
        const pythonResponse = await axios.post('http://ai-service:5001/predict_internal', formData, {
            headers: {
                ...formData.getHeaders() // Important pentru multipart/form-data
            }
        });

        // 3. Ștergem fișierul temporar (nu vrem să umplem serverul cu poze de test)
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Eroare la ștergerea pozei temporare:", err);
        });

        // 4. Procesăm răspunsul primit de la Python
        const result = pythonResponse.data;

        // Dicționar Traducere (Pentru a trimite numele în română înapoi la Angular)
        const dictionarPesti = {
            'Abramis brama': 'Plătică',
            'Acipenseridae': 'Sturion',
            'Anguilla anguilla': 'Anghilă',
            'Aspius aspius': 'Avat',
            'Barbus barbus': 'Mreană',
            'Blicca bjoerkna': 'Batcă / Blică',
            'Carassius carassius': 'Caras Auriu (Carudă)',
            'Carassius gibelio': 'Caras Argintiu',
            'Ctenopharyngodon idella': 'Amur (Cteno)',
            'Cyprinus carpio': 'Crap',
            'Esox lucius': 'Știucă',
            'Gasterosteus aculeatus': 'Ghidrin',
            'Gobio gobio': 'Porcușor',
            'Gymnocephalus cernuus': 'Ghiborț',
            'Lepomis gibbosus': 'Regina (Biban Soare)',
            'Leuciscus cephalus': 'Clean',
            'Leuciscus idus': 'Văduviță',
            'Leuciscus leuciscus': 'Clean mic (Dălbioară)',
            'Neogobius fluviatilis': 'Guvid de baltă',
            'Neogobius kessleri': 'Guvid de Dunăre',
            'Neogobius melanostomus': 'Guvid rotund',
            'Perca fluviatilis': 'Biban',
            'Rhodeus amarus': 'Boarță',
            'Rutilus rutilus': 'Babușcă',
            'Salmo trutta subsp. fario': 'Păstrăv Indigen',
            'Sander lucioperca': 'Șalău',
            'Scardinius erythrophthalmus': 'Roșioară',
            'Silurus glanis': 'Somn',
            'Tinca tinca': 'Lin',
            'Vimba vimba': 'Morunaș'
        };

        const numeRomanesc = dictionarPesti[result.latin_name] || result.latin_name;

        // 5. Trimitem răspunsul final la Angular
        res.json({
            fish_name: numeRomanesc,
            confidence: result.confidence.toFixed(1) + '%',
            latin_name: result.latin_name
        });

    } catch (error) {
        console.error('❌ Eroare comunicare AI:', error.message);
        // Dacă ștergerea a eșuat mai sus din cauza erorii, încercăm din nou
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        res.status(500).json({ error: 'Serviciul AI nu răspunde sau a apărut o eroare.' });
    }
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