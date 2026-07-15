from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE alerts ADD COLUMN target_user_id INT NULL"))
        conn.execute(text("ALTER TABLE alerts ADD CONSTRAINT fk_alerts_target_user FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL"))
        conn.commit()
        print("Column added successfully.")
    except Exception as e:
        if "Duplicate column" in str(e) or "already exists" in str(e).lower():
            print("Column already exists, skipping.")
        else:
            raise
