from flask import Flask, render_template, request, jsonify, session
import os
import random

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

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
    return jsonify({
        'syllable': syllable,
        'gif': SYLLABLES_DATA[syllable]['gif'],
        'options': random.sample(list(SYLLABLES_DATA.keys()), 4) if len(SYLLABLES_DATA) >= 4 else list(SYLLABLES_DATA.keys())
    })

@app.route('/api/predict', methods=['POST'])
def predict_syllable():
    # Mock prediction - in real implementation, this would use ML model
    predictions = random.sample(list(SYLLABLES_DATA.keys()), min(5, len(SYLLABLES_DATA)))
    confidence_scores = [random.uniform(0.6, 0.95) for _ in predictions]
    
    return jsonify({
        'predictions': [
            {'syllable': pred, 'confidence': conf} 
            for pred, conf in zip(predictions, confidence_scores)
        ]
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
