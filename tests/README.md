# 🚀 DigiPe Automated UI Test Suite (Selenium + Pytest + POM)

A clean, beginner-friendly UI test automation framework built with **Python**, **Selenium WebDriver**, and **pytest** for the **DigiPe** digital banking PWA.

This framework is built using the **Page Object Model (POM)** pattern and is designed to be **mastered and explained in 1 to 2 days**.

---

## 📚 1. Core Concepts (Learn in 5 Minutes)

### What is Page Object Model (POM)?
In standard test automation, if a button or input changes in your app, you would have to update 20 different test files. 

With **POM**, we divide our code into two simple layers:
1. **Pages (`pages/`)**: Store **what the page has** (Locators like buttons, inputs) and **what the user can do** (`enter_email()`, `click_login()`).
2. **Test Cases (`test_cases/`)**: Write the actual test scenarios using plain English steps (`login_page.login(...)`, `assert dashboard.is_loaded()`).

If a selector changes on the website, you **only update it in 1 place** (inside `pages/`).

### What is `conftest.py`?
In `pytest`, `conftest.py` is a special file where we define **fixtures**. A fixture prepares things before a test runs (like launching Google Chrome) and cleans up after the test completes (like closing Chrome with `driver.quit()`).

---

## 📂 2. Folder Structure

```
tests/
│
├── conftest.py               # Starts and stops Chrome browser for each test
├── pytest.ini                # Pytest settings & HTML report configuration
├── requirements.txt         # 4 lightweight dependencies
├── test_data.py              # Test credentials & dynamic random user generator
├── README.md                 # This beginner guide & interview notes
│
├── pages/                    # 📄 PAGE OBJECT MODEL LAYER
│   ├── base_page.py          # Common actions (click, type, find, wait)
│   ├── login_page.py         # Sign-in inputs, submit button, error alert
│   ├── signup_page.py        # Registration inputs, submit button, error alert
│   ├── dashboard_page.py     # Welcome header, account cards
│   ├── sidebar_page.py       # Left navigation links & logout button
│   └── link_account_page.py  # Link bank account form & validation
│
└── test_cases/               # 🧪 ACTUAL TEST CASES
    ├── test_login.py         # Valid login, wrong password, empty fields, bad email
    ├── test_signup.py        # New user signup, duplicate email check
    ├── test_navigation.py    # Sidebar navigation checks & logout
    └── test_form_validation.py# 10-digit account number validation & input types
```

---

## ⚙️ 3. Quickstart: Setup in 3 Easy Steps

### Step 1: Create a Python Virtual Environment
Open PowerShell or your terminal in the `tests` directory:
```powershell
cd "e:\My_Project\PAYMENT APP\payflow-main\digipe\tests"
python -m venv venv
.\venv\Scripts\activate
```

### Step 2: Install Dependencies
```powershell
pip install -r requirements.txt
```
*(This installs `selenium`, `pytest`, `webdriver-manager` to automatically download ChromeDriver, and `pytest-html` for visual reports).*

### Step 3: Ensure DigiPe is Running Locally
In separate terminals, start your DigiPe backend and frontend:
1. **Backend** (port 5000):
   ```powershell
   cd "e:\My_Project\PAYMENT APP\payflow-main\digipe\server"
   npm run dev
   ```
2. **Frontend** (port 5173):
   ```powershell
   cd "e:\My_Project\PAYMENT APP\payflow-main\digipe\client"
   npm run dev
   ```

*(Optional: If your database is empty, run `node src/seed.js` inside `server` to create the test user `john@example.com`).*

---

## 🏃 4. Running the Tests

Make sure your virtual environment is active (`(venv)` shown in prompt):

### A. Run all tests with live browser window
```powershell
pytest
```
*You will see Chrome automatically open, perform the actions, and close.*

### B. Run only quick Smoke tests (e.g. Valid Login & Signup)
```powershell
pytest -m smoke
```

### C. Run only Login tests
```powershell
pytest test_cases/test_login.py
```

### D. Run tests in Headless mode (Background - no browser popup)
```powershell
pytest --headless
```

### E. Run against a different URL
```powershell
pytest --base-url http://localhost:3000
```

---

## 📊 5. Visual HTML Test Reports

Every time you run `pytest`, an HTML report named **`report.html`** is automatically generated in the `tests/` folder.

To view it:
- Double click **`report.html`** to open it in your browser.
- It displays which tests passed, which failed, execution time, and error traces.

---

## 🎤 6. Quick Study Guide (How to Explain this in an Interview or Demo)

Here are the 4 most common interview questions on test automation and how to answer them using this project:

#### Q1: "What design pattern did you use for your automated tests?"
> **Answer**: *"I used the **Page Object Model (POM)**. I separated the web elements and UI actions into reusable page classes (`LoginPage`, `DashboardPage`, etc.) and kept the test assertions in separate test scripts (`test_login.py`). This avoids code duplication and makes maintenance very easy if the UI changes."*

#### Q2: "How do you handle element loading and synchronization?"
> **Answer**: *"I avoided hardcoded `time.sleep()` which slows down tests. Instead, I used Selenium's **`WebDriverWait`** with **`expected_conditions`** in my `BasePage`. This explicitly waits only until an element becomes visible or clickable before interacting with it."*

#### Q3: "How do you manage test data for registration tests?"
> **Answer**: *"To prevent signup tests from failing due to duplicate emails or usernames on consecutive runs, I built a `generate_random_user()` utility that appends unique timestamps to usernames and emails for fresh test runs."*

#### Q4: "How do you manage the WebDriver lifecycle?"
> **Answer**: *"I used a pytest fixture in `conftest.py`. It uses `ChromeDriverManager` to automatically fetch the matching ChromeDriver, yields the driver to the test function, and automatically closes the browser via `driver.quit()` during teardown."*
