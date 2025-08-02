from flask import Flask, render_template, request, jsonify, session
import os
import random
import cv2
import dlib
import numpy as np
import tensorflow as tf
import uuid
from collections import deque
from datetime import datetime, timedelta
import base64
from io import BytesIO
from PIL import Image

app = Flask(__name__)
app.secret_key = 'e94c984be9a156848e9d4db164bcdab1'
app.permanent_session_lifetime = timedelta(days=30)

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
    'be': {
        'description': 'The B begins the same as in ba, with the lips pressing together and then releasing. The E is a mid-front vowel with a short “eh” sound. The jaw is slightly open, and the lips gently spread. The feeling for this sound is a soft pop followed by a short, forward vowel.',
        #'gif': '/static/gifs/ba.gif',
        'difficulty': 2
    },
    'bi': {
        'description': 'The B is produced by closing and releasing the lips, and the I sound is a high front vowel. The tongue is raised toward the roof of the mouth, and the lips are spread like a smile. The feeling for this sound is a gentle pop from the lips and a bright, sharp “ee” sound.',
        #'gif': '/static/gifs/ba.gif',
        'difficulty': 2
    },
    'bo': {
        'description': 'The B is voiced and made with a lip press and release. The O is a mid-back rounded vowel. The lips round into a small circle, and the tongue pulls back slightly. The feeling for this sound is a soft, voiced beginning with a rounded, “oh” finish.',
        #'gif': '/static/gifs/ba.gif',
        'difficulty': 2
    },
    'bu': {
        'description': 'The B starts with closed lips and a voiced release. The U is a high back rounded vowel — the lips are tightly rounded and the tongue rises toward the back of the mouth. The feeling for this sound is a closed burst followed by a deep, “oo” vowel.',
        #'gif': '/static/gifs/ba.gif',
        'difficulty': 2
    },
    'ka': {
        'description': 'Back of tongue touches soft palate, then releases with "a" mouth position.',
        'gif': '/static/gifs/ka.gif',
        'difficulty': 3
    },
    'ke': {
        'description': 'The K is made by blocking airflow at the back of the mouth with the tongue and then releasing it quickly. The E is a mid-front vowel — the mouth opens slightly, the tongue is forward, and the lips are lightly spread. The feeling is a hard release followed by a short “eh” sound.',
        #'gif': '/static/gifs/ka.gif',
        'difficulty': 3
    },
    'ki': {
        'description': 'The K is formed by the tongue blocking the back of the mouth (velar area), followed by a clean burst of air. The I is a high front vowel, so the lips stretch slightly and the tongue is raised toward the roof of the mouth. The feeling is a sharp stop followed by a bright “ee” sound.',
        #'gif': '/static/gifs/ka.gif',
        'difficulty': 3
    },
    'ko': {
        'description': 'The K sound forms at the back of the mouth with no vocal cord vibration. The O is a mid-back rounded vowel. The lips form a round shape, and the tongue is positioned toward the back. The feeling is a back-of-the-throat burst followed by a rounded “oh.”',
        #'gif': '/static/gifs/ka.gif',
        'difficulty': 3
    },
    'ku': {
        'description': 'The K is voiceless and made at the back of the mouth, while the U is a high back rounded vowel. The lips round tightly, and the tongue moves high and back. The feeling is a clean stop followed by a closed, “oo” sound.',
        #'gif': '/static/gifs/ka.gif',
        'difficulty': 3
    },
    'da': {
        'description': 'Touch tongue tip to roof of mouth behind teeth, then release to "a" position.',
        'gif': '/static/gifs/da.gif',
        'difficulty': 3
    },
    'de': {
        'description': 'The D starts with vibration at the teeth, and the E is a short “eh” sound — tongue mid-front, lips slightly spread.',
        #'gif': '/static/gifs/da.gif',
        'difficulty': 3
    },
    'di': {
        'description': 'The D is voiced at the teeth, while the I is a high front vowel — tongue high and lips spread.',
        #'gif': '/static/gifs/da.gif',
        'difficulty': 3
    },
    'do': {
        'description': 'The D is made with vibration at the teeth, and the O is a rounded mid-back sound — lips round, tongue shifts back.',
        #'gif': '/static/gifs/da.gif',
        'difficulty': 3
    },
    'du': {
        'description': 'The D is voiced at the teeth, and the U is a high back vowel — lips round, tongue rises toward the back.',
        #'gif': '/static/gifs/da.gif',
        'difficulty': 3
    },
    'ga': {
        'description': 'The G is a voiced velar stop — just like K, it is made at the back of the mouth (tongue touches the soft palate), but with vocal cord vibration. The A sound is open: the jaw drops, tongue stays low, and lips are neutral.',
        #'gif': '/static/gifs/ga.gif',
        'difficulty': 3
    },
    'ge': {
        'description': 'The G starts at the back of the mouth, with vibration, and the E is a short “eh” sound: tongue is mid-front, lips slightly spread.',
        #'gif': '/static/gifs/ga.gif',
        'difficulty': 3
    },
    'gi': {
        'description': 'The G is voiced and formed at the back of the mouth. The I is a high front vowel, made with spread lips and a high tongue position.',
        #'gif': '/static/gifs/ga.gif',
        'difficulty': 3
    },
    'go': {
        'description': 'The G uses the back of the tongue and soft palate with vocal cord vibration. The O is a mid-back rounded vowel — lips form a round shape and tongue shifts back.',
        #'gif': '/static/gifs/ga.gif',
        'difficulty': 3
    },
    'gu': {
        'description': 'The G is voiced and formed at the velum (back of the mouth). The U is a high back rounded vowel: lips round tightly, and the tongue rises toward the soft palate.',
        #'gif': '/static/gifs/ga.gif',
        'difficulty': 3
    },
    'ha': {
        'description': 'The H is a voiceless glottal fricative — it is made by gently pushing air through the vocal cords without vibration. The A is an open vowel: the jaw drops, the tongue stays low, and the lips are neutral.',
        #'gif': '/static/gifs/ha.gif',
        'difficulty': 3
    },
    'he': {
        'description': 'The H is airy and soft, and the E is a mid-front vowel: tongue is forward, lips slightly spread. The sound is light and short.',
        #'gif': '/static/gifs/ha.gif',
        'difficulty': 3
    },
    'hi': {
        'description': 'The H is again breathy and soft, and the I is a high front vowel — lips spread like a smile, and the tongue is high.',
        #'gif': '/static/gifs/ha.gif',
        'difficulty': 3
    },
    'ho': {
        'description': 'The H sound comes from the throat, soft and airy. The O is a mid-back rounded vowel — the lips form a small circle, and the tongue is pulled back slightly.',
        #'gif': '/static/gifs/ha.gif',
        'difficulty': 3
    },
    'hu': {
        'description': 'The H sound is gentle and made in the throat. The U is a high back rounded vowel — lips are tightly rounded, and the tongue is high and back.',
        #'gif': '/static/gifs/ha.gif',
        'difficulty': 3
    },
    'la': {
        'description': 'The L is a voiced alveolar lateral consonant — the tongue tip touches just behind the upper front teeth, and air flows around the sides of the tongue. The A is an open vowel: jaw drops, tongue is low, lips neutral.',
        #'gif': '/static/gifs/la.gif',
        'difficulty': 3
    },
    'le': {
        'description': 'The L is formed with the tip of the tongue touching the alveolar ridge. The E is a short “eh” sound: tongue moves forward, lips slightly spread.',
        #'gif': '/static/gifs/la.gif',
        'difficulty': 3
    },
    'li': {
        'description': 'The L starts at the alveolar ridge, and the I is a high front vowel: tongue is raised, lips spread in a smile.',
        #'gif': '/static/gifs/la.gif',
        'difficulty': 3
    },
    'lo': {
        'description': 'The L is voiced and made at the front with the tongue touching just behind the teeth. The O is a rounded back vowel — lips form a small circle, and the tongue moves slightly back.',
        #'gif': '/static/gifs/la.gif',
        'difficulty': 3
    },
    'lu': {
        'description': 'The L uses the tongue tip touching the alveolar ridge. The U is a high back vowel — lips are rounded, and the tongue is high and back.',
        #'gif': '/static/gifs/la.gif',
        'difficulty': 3
    }
}

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
@app.before_request
def before_request():
    session.permanent = True  # Make session permanent
    
    # Generate unique session ID if not exists
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['created_at'] = datetime.now().isoformat()
        session['total_sessions'] = 1
        session['current_session_start'] = datetime.now().isoformat()
        session['page_visits'] = 0
    
    # Only increment page visits, not sessions
    if request.endpoint and request.endpoint not in ['static', 'get_session_info']:
        session['page_visits'] = session.get('page_visits', 0) + 1


@app.route('/api/session/info')
def get_session_info():
    # Only show welcome message once per session
    show_welcome = session.get('welcome_shown', False)
    if not show_welcome:
        session['welcome_shown'] = True
    
    return jsonify({
        'user_id': session.get('user_id'),
        'created_at': session.get('created_at'),
        'total_sessions': session.get('total_sessions', 1),
        'page_visits': session.get('page_visits', 0),
        'show_welcome': not show_welcome,
        'is_new_user': session.get('total_sessions', 1) == 1
    })

# Add route to mark syllable as mastered
@app.route('/api/syllable/<syllable>/master', methods=['POST'])
def master_syllable(syllable):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'No session found'}), 400
        
        # Get current mastered syllables from session
        mastered = session.get('mastered_syllables', [])
        
        if syllable not in mastered:
            mastered.append(syllable)
            session['mastered_syllables'] = mastered
            
            # Also update points
            current_points = session.get('total_points', 0)
            session['total_points'] = current_points + 100
            
            return jsonify({
                'success': True,
                'message': f'Syllable {syllable} mastered!',
                'total_mastered': len(mastered),
                'points_earned': 100,
                'total_points': session['total_points']
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Syllable already mastered'
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add route to save quiz score
@app.route('/api/quiz/save-score', methods=['POST'])
def save_quiz_score():
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'No session found'}), 400
        
        # Get current high scores (keep top 3)
        high_scores = session.get('quiz_high_scores', [])
        
        new_score = {
            'score': data.get('score', 0),
            'accuracy': data.get('accuracy', 0),
            'date': datetime.now().isoformat(),
            'difficulty': data.get('difficulty', 'easy')
        }
        
        high_scores.append(new_score)
        # Sort by score descending and keep top 3
        high_scores.sort(key=lambda x: x['score'], reverse=True)
        session['quiz_high_scores'] = high_scores[:3]
        
        return jsonify({
            'success': True,
            'high_scores': session['quiz_high_scores'],
            'is_new_high_score': len(high_scores) == 1 or new_score['score'] == high_scores[0]['score']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/progress/get')
def get_progress():
    user_id = session.get('user_id')
    
    return jsonify({
        'user_id': user_id,
        'mastered_syllables': session.get('mastered_syllables', []),
        'total_points': session.get('total_points', 0),
        'quiz_high_scores': session.get('quiz_high_scores', []),
        'session_info': {
            'created_at': session.get('created_at'),
            'total_sessions': session.get('total_sessions', 1),
            'page_visits': session.get('page_visits', 0)
        }
    })

@app.route('/api/progress/sync', methods=['POST'])
def sync_progress():
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'No session found'}), 400

        progress_data = {
            'user_id': user_id,
            'completed': data.get('completed', []),
            'points': data.get('points', 0),
            'total_time': data.get('total_time', 0),
            'last_updated': datetime.now().isoformat()
        }
        
        session['progress'] = progress_data
        
        return jsonify({
            'success': True,
            'message': 'Progress synced successfully',
            'user_id': user_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        
        # Mock face/mouth detection - higher chance of detection
        face_detected = random.random() > 0.1  # 90% chance of detection
        
        if not face_detected:
            return jsonify({
                'detected': False,
                'message': 'No face detected'
            })
        
        # Mock model prediction with bias toward correct answer
        all_syllables = list(SYLLABLES_DATA.keys())
        
        # 70% chance of getting the correct syllable
        if random.random() < 0.7:
            predicted_syllable = syllable
        else:
            # 30% chance of getting a different syllable
            other_syllables = [s for s in all_syllables if s != syllable]
            predicted_syllable = random.choice(other_syllables) if other_syllables else syllable
        
        # Calculate if prediction matches target
        is_correct = predicted_syllable.lower() == syllable.lower()
        
        # More realistic confidence scores
        if is_correct:
            target_confidence = random.uniform(0.75, 0.95)
            accuracy = random.uniform(0.8, 0.95)
        else:
            target_confidence = random.uniform(0.3, 0.6)
            accuracy = random.uniform(0.4, 0.7)
        
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