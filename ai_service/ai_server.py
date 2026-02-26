import os
import io
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

# ── 1. ÎNCĂRCARE MODEL ──
MODEL_SOURCE = 'model_pesti_efficientnet_final.keras'
model = None

if os.path.exists(MODEL_SOURCE):
    print(f"⏳ Încărcare model: {MODEL_SOURCE}")
    try:
        model = tf.keras.models.load_model(MODEL_SOURCE, compile=False)
        print("✅ MODEL ACTIVAT!")
    except Exception as e:
        print(f"❌ Eroare la inițializare: {e}")
        import traceback
        traceback.print_exc()

# ── 2. LISTA SPECII ──
class_names = [
    'Abramis brama', 'Acipenseridae', 'Anguilla anguilla', 'Aspius aspius',
    'Barbus barbus', 'Blicca bjoerkna', 'Carassius carassius', 'Carassius gibelio',
    'Ctenopharyngodon idella', 'Cyprinus carpio', 'Esox lucius', 'Gasterosteus aculeatus',
    'Gobio gobio', 'Gymnocephalus cernuus', 'Lepomis gibbosus', 'Leuciscus cephalus',
    'Leuciscus idus', 'Leuciscus leuciscus', 'Neogobius fluviatilis', 'Neogobius kessleri',
    'Neogobius melanostomus', 'Perca fluviatilis', 'Rhodeus amarus', 'Rutilus rutilus',
    'Salmo trutta subsp. fario', 'Sander lucioperca', 'Scardinius erythrophthalmus',
    'Silurus glanis', 'Tinca tinca', 'Vimba vimba'
]

# ── 3. PREDICȚIE ──
@app.route('/predict_internal', methods=['POST'])
def predict_internal():
    if model is None: return jsonify({'error': 'Model neincarcat'}), 500
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400

    file = request.files['file']

    try:
        # 1. Deschidere imagine — 260x260 pentru EfficientNetB0
        img = Image.open(io.BytesIO(file.read())).convert('RGB')
        img = img.resize((260, 260), Image.LANCZOS)

        # 2. Conversie la array (0-255)
        # NU aplicăm nicio normalizare manuală — EfficientNetB0
        # are preprocessing-ul integrat în arhitectură
        img_array = np.array(img, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)

        # 3. Predicție
        predictions = model.predict(img_array, verbose=0)
        output = predictions[0]

        # 4. Softmax (modelul are deja Softmax, dar verificăm)
        if np.isclose(np.sum(output), 1.0, atol=0.1):
            score = output
            print("ℹ️ Modelul are Softmax inclus. Folosim output direct.")
        else:
            score = tf.nn.softmax(output).numpy()
            print("ℹ️ Modelul returnează Logits. Aplicăm Softmax manual.")

        # 5. Rezultat
        index_max = np.argmax(score)
        latin_name = class_names[index_max]
        confidence = float(100 * np.max(score))

        print(f"✅ Rezultat: {latin_name} ({confidence:.2f}%)")

        return jsonify({
            'latin_name': latin_name,
            'confidence': confidence
        })

    except Exception as e:
        print(f"❌ CRASH: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)