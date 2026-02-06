from langchain_core.documents import Document
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

def build_rag():
    docs = [
        Document(page_content="Typhoid fever is a bacterial infection caused by Salmonella typhi."),
        Document(page_content="It spreads through contaminated food and water."),
        Document(page_content="Common symptoms include fever, headache, abdominal pain, diarrhea, and nausea."),
        Document(page_content="Preventive measures include clean water, hygiene, and sanitation."),
        Document(page_content="Consult a doctor if fever persists for more than three days.")
    ]

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vectorstore = FAISS.from_documents(docs, embeddings)
    return vectorstore
