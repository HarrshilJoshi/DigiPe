"""
signup_page.py - Page Object for DigiPe Registration Screen (/signup)
---------------------------------------------------------------------
Encapsulates all locators and user actions for the SignUpPage:
- Entering username, first name, last name, phone, email, password
- Clicking 'Create Free Account'
- Reading validation / duplicate errors
"""

from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class SignupPage(BasePage):
    # ==========================================
    # 1. Locators (Matches DigiPe's SignUpPage.jsx)
    # ==========================================
    USERNAME_INPUT = (By.CSS_SELECTOR, "input[placeholder='johndoe123']")
    FIRSTNAME_INPUT = (By.CSS_SELECTOR, "input[placeholder='John']")
    LASTNAME_INPUT = (By.CSS_SELECTOR, "input[placeholder='Doe']")
    PHONE_INPUT = (By.CSS_SELECTOR, "input[placeholder='9876543210']")
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[placeholder='name@example.com']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[placeholder='••••••••']")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_BANNER = (By.CSS_SELECTOR, "div.text-red-655")
    SIGNIN_LINK_BUTTON = (By.XPATH, "//button[contains(text(), 'Sign in here')]")

    def __init__(self, driver, base_url="http://localhost:5173"):
        super().__init__(driver)
        self.url = f"{base_url.rstrip('/')}/signup"

    # ==========================================
    # 2. Page Actions
    # ==========================================
    def load(self):
        """Opens the DigiPe registration page."""
        self.open(self.url)
        return self

    def fill_form(self, username, firstname, lastname, phone, email, password):
        """Fills out all the registration input fields."""
        self.type(self.USERNAME_INPUT, username)
        self.type(self.FIRSTNAME_INPUT, firstname)
        self.type(self.LASTNAME_INPUT, lastname)
        self.type(self.PHONE_INPUT, str(phone))
        self.type(self.EMAIL_INPUT, email)
        self.type(self.PASSWORD_INPUT, password)
        return self

    def click_submit(self):
        """Clicks the 'Create Free Account' submit button."""
        self.click(self.SUBMIT_BUTTON)
        return self

    def register(self, user_dict):
        """Helper that takes a user dictionary and submits the form."""
        self.fill_form(
            username=user_dict["username"],
            firstname=user_dict["firstname"],
            lastname=user_dict["lastname"],
            phone=user_dict["phone"],
            email=user_dict["email"],
            password=user_dict["password"]
        )
        self.click_submit()
        return self

    def get_error_message(self):
        """Returns the text from the registration error banner."""
        return self.get_text(self.ERROR_BANNER)

    def is_error_displayed(self, timeout=3):
        """Returns True if the registration error banner is visible."""
        return self.is_visible(self.ERROR_BANNER, timeout=timeout)

    def click_signin_link(self):
        """Clicks 'Sign in here →' to go back to the login page."""
        self.click(self.SIGNIN_LINK_BUTTON)
