"""
link_account_page.py - Page Object for Link Bank Account (/user/create-account)
--------------------------------------------------------------------------------
Encapsulates form inputs and validations when linking a new bank account:
- Account Number input (must be at least 10 digits)
- IFSC Code input
- Starting balance input
- Submit button and error/success alerts
"""

from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class LinkAccountPage(BasePage):
    # ==========================================
    # 1. Locators (Matches CreateAccountForm.jsx)
    # ==========================================
    PAGE_TITLE = (By.XPATH, "//h2[contains(text(), 'Link Bank Account')]")
    ACCOUNT_NUMBER_INPUT = (By.CSS_SELECTOR, "input[placeholder='e.g. 1000200030']")
    IFSC_INPUT = (By.CSS_SELECTOR, "input[placeholder='e.g. HDFC0001234']")
    BALANCE_INPUT = (By.CSS_SELECTOR, "input[placeholder='e.g. 5000']")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_BANNER = (By.CSS_SELECTOR, "div.text-red-650")
    SUCCESS_BANNER = (By.CSS_SELECTOR, "div.text-emerald-650")

    def __init__(self, driver, base_url="https://digipe.vercel.app"):
        super().__init__(driver)
        self.url = f"{base_url.rstrip('/')}/user/create-account"

    # ==========================================
    # 2. Page Actions
    # ==========================================
    def is_loaded(self, timeout=5):
        """Checks if the Link Bank Account form has loaded."""
        return self.is_visible(self.PAGE_TITLE, timeout=timeout)

    def enter_account_number(self, account_num):
        """Types the account number into the field."""
        self.type(self.ACCOUNT_NUMBER_INPUT, str(account_num))
        return self

    def enter_ifsc(self, ifsc):
        """Types the IFSC code into the field."""
        self.type(self.IFSC_INPUT, ifsc)
        return self

    def enter_balance(self, balance):
        """Types the initial balance into the field."""
        self.type(self.BALANCE_INPUT, str(balance))
        return self

    def click_submit(self):
        """Clicks the 'Link Bank Account' submit button."""
        self.click(self.SUBMIT_BUTTON)
        return self

    def get_error_message(self):
        """Returns the text from the error banner."""
        return self.get_text(self.ERROR_BANNER)

    def is_error_displayed(self, timeout=3):
        """Returns True if the error banner appears."""
        return self.is_visible(self.ERROR_BANNER, timeout=timeout)
