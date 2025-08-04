from flask import Flask, render_template, request, jsonify, session
import os
import random
import cv2
import dlib
import numpy as np
import tensorflow as tf
from collections import deque
import base64
from io import BytesIO
from PIL import Image

app = Flask(__name__)
app.secret_key = ''

# Sample data for syllables and their descriptions
SYLLABLES_DATA = {
    'a': {
        'description': 'Open your mouth wide, drop your jaw, and let the sound flow naturally from your throat.',
        'gif': '/static/gifs/a.gif',
        'difficulty': 1
    },
    'e': {
        'description': 'Slightly open your mouth, tongue in middle position, corners of mouth slightly pulled.',
        'gif': '/static/gifs/e.gif',
        'difficulty': 1
    },
    'i': {
        'description': 'Smile slightly, tongue high and forward, mouth almost closed.',
        'gif': '/static/gifs/i.gif',
        'difficulty': 2
    },
    'o': {
        'description': 'Round your lips into a circle, tongue pulled back, moderate mouth opening.',
        'gif': '/static/gifs/o.gif',
        'difficulty': 2
    },
    'u': {
        'description': 'Pucker your lips tightly, tongue pulled back and down, small mouth opening.',
        'gif': '/static/gifs/u.gif',
        'difficulty': 3
    },
    'ba': {
        'description': 'Press lips together, then release with a puff of air while opening to "a" position.',
        'gif': '/static/gifs/ba.gif',
        'difficulty': 2
    },
    'da': {
        'description': 'Touch tongue tip to roof of mouth behind teeth, then release to "a" position.',
        'gif': '/static/gifs/da.gif',
        'difficulty': 3
    },
    'ka': {
        'description': 'Back of tongue touches soft palate, then releases with "a" mouth position.',
        'gif': '/static/gifs/ka.gif',
        'difficulty': 3
    }
}

# Sample data for Filipino words
WORDS_DATA = {
    'aso': {
        'description': 'A common Filipino word meaning "dog"',
        'gif': '/static/gifs/words/aso.gif',
        'difficulty': 1,
        'translation': 'dog'
    },
    'puso': {
        'description': 'Filipino word meaning "heart"',
        'gif': '/static/gifs/words/puso.gif',
        'difficulty': 2,
        'translation': 'heart'
    },
    'mata': {
        'description': 'Filipino word meaning "eye"',
        'gif': '/static/gifs/words/mata.gif',
        'difficulty': 1,
        'translation': 'eye'
    },
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/camera')
def camera():
    return render_template('camera.html')

@app.route('/learn')
def learn():
    return render_template('learn.html', syllables=SYLLABLES_DATA)

@app.route('/learn/<syllable>')
def learn_syllable(syllable):
    if syllable in SYLLABLES_DATA:
        return render_template('syllable.html', syllable=syllable, data=SYLLABLES_DATA[syllable])
    return render_template('404.html'), 404

@app.route('/quiz')
def quiz():
    return render_template('quiz.html')

@app.route('/api/quiz/question')
def get_quiz_question():
    syllable = random.choice(list(SYLLABLES_DATA.keys()))
    all_syllables = list(SYLLABLES_DATA.keys())
    
    # Ensure we have the correct answer in options
    options = [syllable]  # Start with correct answer
    remaining = [s for s in all_syllables if s != syllable]
    
    # Add 3 random incorrect options
    while len(options) < 4 and remaining:
        incorrect = random.choice(remaining)
        options.append(incorrect)
        remaining.remove(incorrect)
    
    # Shuffle so correct answer isn't always first
    random.shuffle(options)
    
    return jsonify({
        'syllable': syllable,
        'gif': SYLLABLES_DATA[syllable]['gif'],
        'options': options
    })


@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/docs')
def documentation():
    return render_template('docs.html')

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)



# Add these configurations after the imports
MODEL_PATH = "model_vowelspcv150.h5"
DLIB_PATH = "face_weights.dat"
LABELS = ["a", "e", "i", "o", "u"]
SEQUENCE_LENGTH = 22
FRAME_WIDTH, FRAME_HEIGHT = 112, 80
MOUTH_MOVEMENT_THRESHOLD = 12

# Load model and detector globally
model = tf.keras.models.load_model(MODEL_PATH)
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(DLIB_PATH)

# Add your extract_mouth function here
def extract_mouth(frame, landmarks):
    # Copy your exact extract_mouth function from predict.py
    mouth_points = np.array([(landmarks.part(i).x, landmarks.part(i).y) for i in range(48, 68)])
    x, y, w, h = cv2.boundingRect(mouth_points)
    margin = 10
    x1 = max(x - margin, 0)
    y1 = max(y - margin, 0)
    x2 = min(x + w + margin, frame.shape[1])
    y2 = min(y + h + margin, frame.shape[0])
    mouth_crop = frame[y1:y2, x1:x2]
    
    h_crop, w_crop, _ = mouth_crop.shape
    scale = min(FRAME_WIDTH / w_crop, FRAME_HEIGHT / h_crop)
    new_w, new_h = int(w_crop * scale), int(h_crop * scale)
    resized = cv2.resize(mouth_crop, (new_w, new_h))
    
    pad_top = (FRAME_HEIGHT - new_h) // 2
    pad_bottom = FRAME_HEIGHT - new_h - pad_top
    pad_left = (FRAME_WIDTH - new_w) // 2
    pad_right = FRAME_WIDTH - new_w - pad_left
    padded = cv2.copyMakeBorder(resized, pad_top, pad_bottom, pad_left, pad_right, borderType=cv2.BORDER_REFLECT)
    
    lab = cv2.cvtColor(padded, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(3, 3))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    enhanced = cv2.GaussianBlur(enhanced, (7, 7), 0)
    enhanced = cv2.bilateralFilter(enhanced, 5, 75, 75)
    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
    enhanced = cv2.filter2D(enhanced, -1, kernel)
    enhanced = cv2.GaussianBlur(enhanced, (5, 5), 0)
    return enhanced

@app.route('/api/predict', methods=['POST'])
def predict_syllable():
    try:
        # Get image data from request
        if 'image' in request.files:
            file = request.files['image']
            image_data = file.read()
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Detect face and extract mouth
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)
        
        if not faces:
            return jsonify({'predictions': []})
        
        face = faces[0]
        landmarks = predictor(gray, face)
        mouth = extract_mouth(frame, landmarks)
        
        # For single frame prediction, create a sequence by repeating the frame
        sequence = np.array([mouth] * SEQUENCE_LENGTH)
        sequence_input = sequence[None, ...]
        
        # Make prediction
        preds = model.predict(sequence_input, verbose=0)[0]
        top5 = preds.argsort()[::-1][:5]
        
        # Format results
        predictions = []
        for i in top5:
            predictions.append({
                'syllable': LABELS[i],
                'confidence': float(preds[i])
            })
        
        return jsonify({'predictions': predictions})
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500
    
    try:
        if syllable not in SYLLABLES_DATA:
            return jsonify({'error': 'Invalid syllable'}), 400
            
        # Get image data from request
        if 'image' in request.files:
            file = request.files['image']
            image_data = file.read()
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Detect face and extract mouth
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)
        
        if not faces:
            return jsonify({
                'detected': False,
                'message': 'No face detected',
                'target_syllable': syllable,
                'accuracy': 0
            })
        
        face = faces[0]
        landmarks = predictor(gray, face)
        mouth = extract_mouth(frame, landmarks)
        
        # Create sequence for prediction
        sequence = np.array([mouth] * SEQUENCE_LENGTH)
        sequence_input = sequence[None, ...]
        
        # Make prediction
        preds = model.predict(sequence_input, verbose=0)[0]
        
        # Get prediction for target syllable
        target_index = LABELS.index(syllable)
        target_confidence = float(preds[target_index])
        
        # Get top prediction
        top_prediction_index = np.argmax(preds)
        top_prediction = LABELS[top_prediction_index]
        top_confidence = float(preds[top_prediction_index])
        
        # Determine if user is saying the correct syllable
        is_correct = top_prediction == syllable
        accuracy_threshold = 0.6  # Adjust as needed
        
        return jsonify({
            'detected': True,
            'target_syllable': syllable,
            'predicted_syllable': top_prediction,
            'target_confidence': target_confidence,
            'top_confidence': top_confidence,
            'is_correct': is_correct and target_confidence > accuracy_threshold,
            'accuracy': target_confidence,
            'message': f"You said '{top_prediction}'" + (f" (correct!)" if is_correct else f" (try '{syllable}')")
        })
        
    except Exception as e:
        print(f"Syllable prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500
    
@app.route('/api/predict/syllable/<syllable>', methods=['POST'])
def predict_specific_syllable(syllable):
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        image_file = request.files['image']
        
        # Here you would integrate your trained model
        # For now, using mock prediction logic
        
        # Mock face/mouth detection
        face_detected = True  # Your face detection logic here
        
        if not face_detected:
            return jsonify({
                'detected': False,
                'message': 'No face detected'
            })
        
        # Mock model prediction - replace with your actual model
        import random
        all_syllables = list(SYLLABLES_DATA.keys())
        predicted_syllable = random.choice(all_syllables)
        
        # Calculate if prediction matches target
        is_correct = predicted_syllable.lower() == syllable.lower()
        
        # Mock confidence scores
        target_confidence = random.uniform(0.7, 0.95) if is_correct else random.uniform(0.3, 0.6)
        accuracy = target_confidence if is_correct else random.uniform(0.4, 0.7)
        
        return jsonify({
            'detected': True,
            'is_correct': is_correct,
            'predicted_syllable': predicted_syllable,
            'target_syllable': syllable,
            'target_confidence': target_confidence,
            'accuracy': accuracy,
            'message': f'Detected: {predicted_syllable}' + (' ✓' if is_correct else f' (expected: {syllable})')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
@app.route('/word-quiz')
def word_quiz():
    return render_template('word-quiz.html')

@app.route('/api/word-quiz/question')
def get_word_quiz_question():
    word = random.choice(list(WORDS_DATA.keys()))
    # Ensure correct answer is always included
    options = [word]
    remaining_words = [w for w in WORDS_DATA.keys() if w != word]
    
    # Add 3 random incorrect options
    while len(options) < 4 and remaining_words:
        random_word = random.choice(remaining_words)
        options.append(random_word)
        remaining_words.remove(random_word)
    
    # Shuffle options
    random.shuffle(options)
    
    return jsonify({
        'word': word,
        'gif': WORDS_DATA[word]['gif'],
        'translation': WORDS_DATA[word]['translation'],
        'options': options
    })

@app.route('/api/reset', methods=['POST'])
def reset_predictions():
    try:
        # Example: Reset session values if you're tracking them
        session['total_predictions'] = 0
        session['avg_confidence'] = 0
        session['top_syllable'] = "-"
        
        return jsonify({'status': 'success', 'message': 'Predictions reset successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500