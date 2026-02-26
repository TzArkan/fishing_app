import tensorflow as tf
import numpy as np

# Creăm un model gol doar ca să pornească serverul
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(224, 224, 3)),
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dense(30, activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy')
# Salvăm exact cu numele pe care îl caută Docker
model.save('model_pesti_final.h5')
print("✅ Fișierul a fost creat!")