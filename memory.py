from supabase_client import supabase

def save_message(student_id, sender, message):
    supabase.table("chat_history").insert({
        "student_id": student_id,
        "sender": sender,
        "message": message
    }).execute()

def get_chat_history(student_id, limit=10):
    response = supabase.table("chat_history") \
        .select("sender, message") \
        .eq("student_id", student_id) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()

    if not response.data:
        return "No previous chat found."

    # Combine last few messages into readable format
    history = "\n".join([f"{msg['sender']}: {msg['message']}" for msg in reversed(response.data)])
    return history
