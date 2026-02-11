from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import requests
import json
import re

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
# Symptom Keywords (Fallback)
# ===============================
SYMPTOM_KEYWORDS = {
    "fever": ["fever", "high temperature", "hot body"],
    "headache": ["headache", "head pain"],
    "muscle pain": ["muscle pain", "body pain", "body ache"],
    "nausea": ["nausea", "vomiting", "feeling sick"],
    "diarrhea": ["diarrhea", "loose motion", "loose motions"],
    "cough": ["cough", "dry cough"]
}

def extract_symptoms_heuristic(text):
    lowered = text.lower()
    return {
        symptom: int(any(k in lowered for k in keywords))
        for symptom, keywords in SYMPTOM_KEYWORDS.items()
    }

# ===============================
# Conversation State
# ===============================
user_state = {
    "data": {},
    "age": None,
    "gender": None,
    "expecting_more": False
}

def reset_session():
    user_state["data"] = {}
    user_state["age"] = None
    user_state["gender"] = None
    user_state["expecting_more"] = False

# ===============================
# NLP Extraction with Mistral
# ===============================
def extract_with_mistral(text):
    prompt = f"""
Extract medical information and return ONLY valid JSON.

Fields:
age (number or null)
gender ("male","female","unknown")
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

        # sanitize None → 0
        for k in ["fever","headache","muscle pain","nausea","diarrhea","cough"]:
            if data.get(k) is None:
                data[k] = 0

        return data

    except Exception:
        return None

# ===============================
# RAG Explanation
# ===============================
def rag_explain(query):
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
        json={"model": "mistral", "prompt": prompt, "stream": False}
    )

    return response.json().get("response", "Please consult a doctor.")

# ===============================
# Intent Detection
# ===============================
INFO_KEYWORDS = [
    "what is", "why", "how", "precautions", "treatment",
    "details", "should i", "can i", "is it dangerous"
]

def is_info_query(text):
    return any(k in text for k in INFO_KEYWORDS)

# ===============================
# Chat Endpoint
# ===============================
@app.route("/chat", methods=["POST"])
def chat():
    text = request.json.get("message", "").strip().lower()

    # Greeting
    if text in ["hi", "hello", "hey", "hii"]:
        reset_session()
        return jsonify({
            "reply": "Hello 👋 You can describe your symptoms in your own words."
        })

    if user_state["expecting_more"] and text in ["no", "nope", "none", "no more", "that's all", "that is all"]:
        if not user_state["data"]:
            return jsonify({
                "reply": "Please share at least one symptom so I can assess it."
            })

        age = user_state["age"] or 25
        gender = 1 if user_state["gender"] == "male" else 0

        data = {
            "Age": age,
            "Gender": gender,
            "headache": user_state["data"].get("headache", 0),
            "muscle pain": user_state["data"].get("muscle pain", 0),
            "nausea": user_state["data"].get("nausea", 0),
            "diarrhea": user_state["data"].get("diarrhea", 0),
            "cough": user_state["data"].get("cough", 0),
            "fever range (deg F)": 102 if user_state["data"].get("fever", 0) else 98.6,
            "Hemoglobin (g/dL)": 13.5,
            "Platelet Count": 250000,
            "Urine Culture Bacteria": 0,
            "Calcium (mg/dL)": 9.5,
            "Potassium (mg/dL)": 4.0
        }

        X = scaler.transform([[data.get(col, 0) for col in feature_columns]])
        prob = nb_model.predict_proba(X)[0][1]

        if prob < 0.5:
            reply = "Your symptoms do not strongly indicate typhoid. If symptoms persist, consult a doctor."
        elif prob < 0.7:
            reply = "I am not fully confident. Please consult a medical professional."
        else:
            reply = "There is a possibility of typhoid. Would you like to know precautions or more details?"

        reset_session()
        return jsonify({
            "reply": reply,
            "confidence": round(prob * 100, 2)
        })

    # Knowledge / Info → RAG
    if is_info_query(text) and not user_state["expecting_more"]:
        return jsonify({"reply": rag_explain(text)})

    # NLP Extraction
    extracted = extract_with_mistral(text)

    if not extracted:
        return jsonify({
            "reply": "I couldn’t understand clearly. Please describe your symptoms again."
        })

    user_state["age"] = extracted.get("age") or user_state["age"]
    user_state["gender"] = extracted.get("gender") or user_state["gender"]

    heuristic = extract_symptoms_heuristic(text)

    for key in ["fever", "headache", "muscle pain", "nausea", "diarrhea", "cough"]:
        if extracted.get(key) == 1 or heuristic.get(key) == 1:
            user_state["data"][key] = 1

    remaining = [
        "fever",
        "headache",
        "muscle pain",
        "nausea",
        "diarrhea",
        "cough"
    ]
    remaining = [r for r in remaining if user_state["data"].get(r, 0) == 0]

    user_state["expecting_more"] = True
    if remaining:
        return jsonify({
            "reply": "Thanks. Do you have any of these symptoms: " + ", ".join(remaining) + "? If not, please say 'no'."
        })

    return jsonify({
        "reply": "Thanks. Do you have any other symptoms? If not, please say 'no'."
    })

# ===============================
# Run Server
# ===============================
if __name__ == "__main__":
    app.run(port=5001, debug=True)
