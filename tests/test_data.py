"""
test_data.py - Test Data and Helper Constants
----------------------------------------------
Central place for test user accounts, credentials, and error messages.
Keeping test data separate from test code makes it easy to update or change credentials
without touching the actual test scripts.
"""

import time
import random

# ==========================================
# 1. Existing Test User Credentials
# (Pre-configured from server/src/seed.js)
# ==========================================
VALID_USER = {
    "email": "john@example.com",
    "password": "password123",
    "firstname": "John",
    "lastname": "Doe"
}

INVALID_PASSWORD_USER = {
    "email": "john@example.com",
    "password": "WrongPassword999!"
}

NON_EXISTENT_USER = {
    "email": "ghost_user_9999@example.com",
    "password": "password123"
}

# ==========================================
# 2. Expected Server Error Messages
# (Matches auth.controller.js in server)
# ==========================================
ERROR_INVALID_PASSWORD = "Invalid Password"
ERROR_INVALID_EMAIL = "Invalid Email"
ERROR_DUPLICATE_USER = "Email or username already taken"

# ==========================================
# 3. Dynamic User Generator for Signup Tests
# Generates unique username & email each time so
# tests can run repeatedly without collision errors.
# ==========================================
def generate_random_user():
    """Generates a unique user dict for fresh signup tests."""
    timestamp = int(time.time())
    rand_num = random.randint(100, 999)
    return {
        "username": f"user_{timestamp}_{rand_num}",
        "firstname": "Test",
        "lastname": "User",
        "phone": f"98{random.randint(10000000, 99999999)}",
        "email": f"test_{timestamp}_{rand_num}@example.com",
        "password": "password123"
    }
