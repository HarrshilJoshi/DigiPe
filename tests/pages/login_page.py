"""
login_page.py - Page Object for DigiPe Sign-in Screen (/signin)
--------------------------------------------------------------
Encapsulates all locators and user actions for the SignInPage:
- Entering email & password
- Clicking the 'Sign in to Account' button
- Reading error messages (e.g. 'Invalid Password')
- Navigating to the Signup page
"""

from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class LoginPage(BasePage):
    # ==========================================
    # 1. Locators (Matches DigiPe's SignInPage.jsx)
    # ==========================================
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password']")
    SIGN_IN_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_BANNER = (By.CSS_SELECTOR, "div.text-red-650")
    CREATE_ACCOUNT_BUTTON = (By.XPATH, "//button[contains(text(), 'Create an account')]")

    def __init__(self, driver, base_url="https://digipe.vercel.app"):
        super().__init__(driver)
        self.url = f"{base_url.rstrip('/')}/signin"

    # ==========================================
    # 2. Page Actions
    # ==========================================
    def load(self):
        """Opens the DigiPe login page in the browser."""
        self.open(self.url)
        return self

    def enter_email(self, email):
        """Types an email into the email input field."""
        self.type(self.EMAIL_INPUT, email)
        return self

    def enter_password(self, password):
        """Types a password into the password input field."""
        self.type(self.PASSWORD_INPUT, password)
        return self

    def click_signin(self):
        """Clicks the 'Sign in to Account' button."""
        self.click(self.SIGN_IN_BUTTON)
        return self

    def login(self, email, password):
        """
        Convenience shortcut method that performs the full login flow:
        enters email, enters password, and clicks sign-in.
        """
        self.enter_email(email)
        self.enter_password(password)
        self.click_signin()
        return self

    def click_create_account(self):
        """Clicks 'Create an account →' to navigate to the signup page."""
        self.click(self.CREATE_ACCOUNT_BUTTON)

    def get_error_message(self):
        """Returns the text from the red error message banner."""
        return self.get_text(self.ERROR_BANNER)

    def is_error_displayed(self, timeout=3):
        """Returns True if the red error banner appears on screen."""
        return self.is_visible(self.ERROR_BANNER, timeout=timeout)

    def is_email_valid(self):
        """Returns True if email input satisfies HTML5 required and format rules."""
        return self.is_input_valid(self.EMAIL_INPUT)

    def is_password_valid(self):
        """Returns True if password input satisfies HTML5 required rules."""
        return self.is_input_valid(self.PASSWORD_INPUT)
