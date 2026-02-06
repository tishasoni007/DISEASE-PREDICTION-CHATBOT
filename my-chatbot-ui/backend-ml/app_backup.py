from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)

# ===============================
# Load ML models and scaler
# ===============================
nb_model = joblib.load("typhoid_nb_model.pkl")
svm_model = joblib.load("typhoid_svm_model.pkl")
scaler = joblib.load("scaler.pkl")
feature_columns = joblib.load("feature_columns.pkl")

# ===============================
# Conversation memory
# ===============================
user_state = {
    "data": {},
    "asked_lab": False
}

# ===============================
# Symptom keyword dictionary
# ===============================
SYMPTOM_KEYWORDS = {
    "fever": ["fever", "high temperature", "hot body"],
    "headache": ["headache", "head pain"],
    "muscle pain": ["muscle pain", "body pain", "body ache"],
    "nausea": ["nausea", "vomiting", "feeling sick"],
    "diarrhea": ["diarrhea", "loose motion", "loose motions"],
    "cough": ["cough", "dry cough"]
}

# ===============================
# Helper functions
# ===============================
def extract_symptoms(text):
    text = text.lower()
    extracted = {}
    for symptom, keywords in SYMPTOM_KEYWORDS.items():
        extracted[symptom] = int(any(k in text for k in keywords))
    return extracted

def reset_session():
    user_state["data"] = {}
    user_state["asked_lab"] = False

# ===============================
# Chat endpoint
# ===============================
@app.route("/chat", methods=["POST"])
def chat():
    message = request.json.get("message", "").lower()

    # Greeting
    if message.strip() in ["hi", "hello", "hey", "hii"]:
        reset_session()
        return jsonify({
            "reply": "Hello 👋 Please describe your symptoms in your own words."
        })

    # Extract symptoms automatically
    extracted = extract_symptoms(message)

    # Update memory
    for k, v in extracted.items():
        if v == 1:
            user_state["data"][k] = 1

    # Count symptoms detected
    symptom_count = sum(user_state["data"].get(k, 0) for k in SYMPTOM_KEYWORDS)

    # Ask follow-up naturally
    if symptom_count < 2:
        return jsonify({
            "reply": "Thanks. Could you tell me if you have fever, headache, nausea, diarrhea, or body pain?"
        })

    # Ask about lab reports once
    if symptom_count >= 2 and not user_state["asked_lab"]:
        user_state["asked_lab"] = True
        return jsonify({
            "reply": "Do you have any recent lab reports like blood tests? If yes, please mention, otherwise say no."
        })

    # ===============================
    # ML PREDICTION PHASE
    # ===============================

    # Core features
    defaults = {
        "Age": 25,
        "Gender": 1,
        "fever range (deg F)": 102 if user_state["data"].get("fever", 0) == 1 else 98.6,
        "Hemoglobin (g/dL)": 13.5,
        "Platelet Count": 250000,
        "Urine Culture Bacteria": 0,
        "Calcium (mg/dL)": 9.5,
        "Potassium (mg/dL)": 4.0
    }

    user_state["data"].update(defaults)

    # Prepare model input
    X = scaler.transform([[user_state["data"].get(col, 0) for col in feature_columns]])

    nb_prob = nb_model.predict_proba(X)[0][1]

    reset_session()

    # Decision logic
    if nb_prob < 0.5:
        return jsonify({
            "reply": "Your symptoms do not strongly indicate typhoid. If symptoms persist, please consult a doctor."
        })
    elif 0.5 <= nb_prob < 0.7:
        return jsonify({
            "reply": "I am not fully confident about the prediction. Please consult a medical professional."
        })
    else:
        return jsonify({
            "reply": "Based on your symptoms, there is a possibility of Typhoid. Please consult a doctor for confirmation."
        })

# ===============================
# Run app
# ===============================
if __name__ == "__main__":
    app.run(port=5001, debug=True)
