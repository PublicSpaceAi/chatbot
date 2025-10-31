from flask import Flask, request, jsonify, render_template
from supabase_client import supabase
from memory import get_chat_history, save_message
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
app = Flask(__name__, template_folder='template', static_folder='static')


def clean_bot_reply(reply):
    """
    Remove JSON objects, data update notifications, and technical information from bot reply.
    Keep only the conversational part.
    """
    import re
    
    # Remove "Updated info:" sections and everything after
    reply = re.sub(r'\n*Updated info:.*', '', reply, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove "New info:" sections and everything after
    reply = re.sub(r'\n*New info:.*', '', reply, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove standalone JSON objects (lines that contain { and })
    lines = reply.split('\n')
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # Skip lines that are pure JSON objects
        if stripped.startswith('{') and stripped.endswith('}'):
            continue
        # Skip lines like "Updated info:" or "New info:"
        if stripped.lower().startswith('updated') or stripped.lower().startswith('new info'):
            continue
        cleaned_lines.append(line)
    
    reply = '\n'.join(cleaned_lines).strip()
    
    return reply


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    student_id = data.get("student_id")
    user_message = data.get("message")

    # Fetch student data
    student_data = supabase.table("students").select("data").eq("student_id", student_id).execute()
    student_info = student_data.data[0]["data"] if student_data.data else {}

    # Get last few messages
    chat_context = get_chat_history(student_id)

    # Build the prompt
    prompt = f"""
You are a friendly assistant who remembers everything about the student.
Student profile:
{student_info}

Recent conversation:
{chat_context}

Student says: {user_message}

1️⃣ Reply naturally like a chatbot.
2️⃣ Learn from the student’s interests/dislikes automatically.
3️⃣ If new interests appear, update them in your memory (shetudent_info).
4️⃣ Never ask again for data already known.
5️⃣ IMPORTANT: Never show JSON objects or data updates in your reply. Keep your reply conversational and natural.
"""

    # Generate reply
    model = genai.GenerativeModel("gemini-2.5-flash")
    try:
        response = model.generate_content(prompt)
        bot_reply = response.text
        
        # Clean the reply: remove any JSON objects or "Updated info:" sections
        bot_reply = clean_bot_reply(bot_reply)
    except Exception as e:
        print("Gemini error:", e)
        bot_reply = "Error generating reply."

    # Save messages
    save_message(student_id, "user", user_message)
    save_message(student_id, "bot", bot_reply)

    # ✨ Extract updated interests automatically
    update_prompt = f"From this chat, update the student info JSON based on what the user likes or dislikes. Keep old info, add new ones. Return ONLY valid JSON, no additional text.\nCurrent info:\n{student_info}\nChat:\nUser: {user_message}\nBot: {bot_reply}"
    try:
        update_resp = model.generate_content(update_prompt)
        new_info = update_resp.text.strip()
    except Exception as e:
        print("Update error:", e)
        new_info = student_info

    # Update student data
    if student_data.data:
        supabase.table("students").update({"data": new_info}).eq("student_id", student_id).execute()
    else:
        supabase.table("students").insert({"student_id": student_id, "data": new_info}).execute()

    return jsonify({"reply": bot_reply})


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv("PORT", 5000)))

