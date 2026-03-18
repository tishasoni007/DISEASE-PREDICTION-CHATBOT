from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import requests
import json
import re
import datetime
import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss

# ===============================
# Flask App
# ===============================
app = Flask(__name__)
CORS(app)

# ===============================
# Load ML Models
# ===============================
nb_model = joblib.load("typhoid_nb_model.pkl")
svm_model = joblib.load("typhoid_svm_model.pkl")
scaler = joblib.load("scaler.pkl")
feature_columns = joblib.load("feature_columns.pkl")

# ===============================
# Load Embedding Model (RAG)
# ===============================
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# ===============================
# Load RAG Documents
# ===============================
try:
    with open("rag_docs/typhoid.txt", "r", encoding="utf-8") as f:
        rag_text = f.read()
except:
    rag_text = """
Typhoid is a bacterial infection caused by Salmonella typhi.
It spreads through contaminated food and water.
Symptoms include fever, headache, diarrhea, abdominal pain, and weakness.
Treatment requires antibiotics prescribed by a doctor.
"""

rag_chunks = [c.strip() for c in rag_text.split("\n") if c.strip()]
rag_embeddings = embedder.encode(rag_chunks)
index = faiss.IndexFlatL2(rag_embeddings.shape[1])
index.add(rag_embeddings)

# ===============================
# RAG FUNCTION (FIXED)
# ===============================
def rag_explain(query):
    try:
        q_emb = embedder.encode([query])
        _, idx = index.search(q_emb, 2)
        context = " ".join([rag_chunks[i] for i in idx[0]])

        prompt = f"""
Answer clearly using the context below.

Context:
{context}

Question:
{query}
"""

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "mistral", "prompt": prompt, "stream": False},
            timeout=60
        )

        return response.json().get("response", "Please consult a doctor.")
    except:
        return "Unable to process request."

# ===============================
# Symptom Keywords
# ===============================
SYMPTOM_KEYWORDS = {
    "fever": ["fever", "high temperature", "hot body"],
    "headache": ["headache", "head pain"],
    "muscle pain": ["muscle pain", "body pain", "body ache"],
    "nausea": ["nausea", "vomiting"],
    "diarrhea": ["diarrhea", "loose motion"],
    "cough": ["cough", "dry cough"]
}

# ===============================
# Conversation State
# ===============================
user_state = {
    "data": {},
    "age": None,
    "gender": None,
    "expecting_more": False,
    "awaiting_fever_level": False,
    "fever_level": None
}

def reset_session():
    user_state["data"] = {}
    user_state["age"] = None
    user_state["gender"] = None
    user_state["expecting_more"] = False
    user_state["awaiting_fever_level"] = False
    user_state["fever_level"] = None

# ===============================
# Fever Mapping
# ===============================
FEVER_MAP = {
    "low": 99.5,
    "medium": 100.8,
    "high": 103.0
}

# ===============================
# Extraction
# ===============================
def extract_symptoms_heuristic(text):
    lowered = text.lower()
    return {
        symptom: int(any(k in lowered for k in keywords))
        for symptom, keywords in SYMPTOM_KEYWORDS.items()
    }

def extract_with_mistral(text):
    prompt = f"""
Extract medical info and return ONLY JSON.

Fields:
age
gender
fever, headache, muscle pain, nausea, diarrhea, cough (0 or 1)

Text:
{text}
JSON:
"""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "mistral", "prompt": prompt, "stream": False},
            timeout=60
        )

        raw = response.json().get("response", "")
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return None

        data = json.loads(match.group())

        for k in SYMPTOM_KEYWORDS.keys():
            if data.get(k) is None:
                data[k] = 0

        return data
    except:
        return None

# ===============================
# Prediction Logic
# ===============================
def run_prediction():

    age = user_state["age"] or 25
    gender = 1 if user_state["gender"] == "male" else 0

    fever_temp = 98.6
    if user_state["data"].get("fever", 0) == 1:
        fever_temp = FEVER_MAP.get(user_state["fever_level"], 100.5)

    data = {
        "Age": age,
        "Gender": gender,
        "headache": user_state["data"].get("headache", 0),
        "muscle pain": user_state["data"].get("muscle pain", 0),
        "nausea": user_state["data"].get("nausea", 0),
        "diarrhea": user_state["data"].get("diarrhea", 0),
        "cough": user_state["data"].get("cough", 0),
        "fever range (deg F)": fever_temp,
        "Hemoglobin (g/dL)": 13.5,
        "Platelet Count": 250000,
        "Urine Culture Bacteria": 0,
        "Calcium (mg/dL)": 9.5,
        "Potassium (mg/dL)": 4.0
    }

    df_input = pd.DataFrame([data])
    df_input = df_input[feature_columns]
    X = scaler.transform(df_input)

    nb_prob = nb_model.predict_proba(X)[0][1]
    svm_prob = svm_model.predict_proba(X)[0][1]
    final_prob = (nb_prob + svm_prob) / 2

    if final_prob < 0.45:
        reply = "Your symptoms do not strongly indicate typhoid. Monitor your health and consult a doctor if symptoms persist."
    elif final_prob < 0.75:
        reply = "There is a moderate possibility of typhoid. Please consult a medical professional for confirmation."
    else:
        reply = "There is a high possibility of typhoid. I strongly recommend consulting a doctor immediately."

    return reply, round(final_prob * 100, 2)

# ===============================
# Chat Endpoint
# ===============================
@app.route("/chat", methods=["POST"])
def chat():

    text = request.json.get("message", "").strip().lower()
    hour = datetime.datetime.now().hour

    # Greetings
    if text in ["hi", "hello", "hey", "hii"]:
        reset_session()
        return jsonify({"reply": "Hello 👋 You can describe your symptoms in your own words."})

    if "how are you" in text:
        return jsonify({"reply": "I'm doing great 😊 I'm here to help you with your health concerns."})

    if "thank" in text:
        return jsonify({"reply": "You're welcome 😊 Stay healthy!"})

    if text in ["bye", "goodbye"]:
        greeting = "Have a great day ☀️" if hour < 18 else "Have a peaceful evening 🌙"
        reset_session()
        return jsonify({"reply": f"Goodbye 👋 {greeting}"})

    # Fever clarification
    if user_state["awaiting_fever_level"]:
        if text in FEVER_MAP.keys():
            user_state["fever_level"] = text
            user_state["awaiting_fever_level"] = False
            return jsonify({"reply": "Thank you. Noted. Please tell me if you have other symptoms."})
        else:
            return jsonify({"reply": "Please tell me if your fever is low, medium, or high."})

    # Prediction trigger
    if user_state["expecting_more"] and text in ["no", "nope", "none", "no more", "that's all"]:
        if not user_state["data"]:
            return jsonify({"reply": "Please share at least one symptom."})

        reply, confidence = run_prediction()
        reset_session()
        return jsonify({"reply": reply, "confidence": confidence})

    # Info Query
    if any(k in text for k in ["what is", "why", "how", "precautions", "treatment"]):
        return jsonify({"reply": rag_explain(text)})

    # Extraction
    extracted = extract_with_mistral(text)
    heuristic = extract_symptoms_heuristic(text)

    if extracted:
        for key in SYMPTOM_KEYWORDS.keys():
            if extracted.get(key) == 1 or heuristic.get(key) == 1:
                user_state["data"][key] = 1
    else:
        for key in SYMPTOM_KEYWORDS.keys():
            if heuristic.get(key) == 1:
                user_state["data"][key] = 1

    # Fever follow-up
    if user_state["data"].get("fever", 0) == 1 and user_state["fever_level"] is None:
        user_state["awaiting_fever_level"] = True
        return jsonify({"reply": "You mentioned fever. Is it low, medium, or high?"})

    remaining = [k for k in SYMPTOM_KEYWORDS.keys() if user_state["data"].get(k, 0) == 0]
    user_state["expecting_more"] = True

    if remaining:
        return jsonify({"reply": "Do you also have: " + ", ".join(remaining) + "? If not, say 'no'."})

    return jsonify({"reply": "Any other symptoms? If not, say 'no'."})

# ===============================
# Run Server
# ===============================
if __name__ == "__main__":
    app.run(port=5001, debug=True)