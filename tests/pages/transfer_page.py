"""
transfer_page.py - Page Object for Fund Transfer and MPIN Modal
----------------------------------------------------------------
Encapsulates the fund transfer workflow:
- Source account selection
- Transfer form inputs (Account, IFSC, Names, Amount, Description)
- MPIN modal keypad entry and submission
- Double-click and submission status indicators (idempotency guards)
"""

from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class TransferPage(BasePage):
    # ==========================================
    # 1. Locators
    # ==========================================
    SOURCE_ACCOUNT_CARDS = (By.CSS_SELECTOR, "div.cursor-pointer")
    FROM_ACCOUNT_SELECT = (By.TAG_NAME, "select")
    TO_ACCOUNT_INPUT = (By.NAME, "toAccountNumber")
    IFSC_INPUT = (By.NAME, "ifsc")
    FIRSTNAME_INPUT = (By.NAME, "firstname")
    LASTNAME_INPUT = (By.NAME, "lastname")
    AMOUNT_INPUT = (By.NAME, "amount")
    DESCRIPTION_INPUT = (By.NAME, "description")
    TRANSFER_SUBMIT_BUTTON = (By.XPATH, "//button[@type='submit' and contains(., 'Transfer')]")

    # MPIN Modal Locators
    MPIN_MODAL = (By.XPATH, "//h3[contains(text(), 'Enter Transaction PIN')]")
    CONFIRM_PIN_BUTTON = (By.XPATH, "//button[contains(text(), 'Confirm')]")
    SUCCESS_MODAL = (By.XPATH, "//div[contains(text(), 'Transaction Successful!')]")
    RECEIPT_BUTTON = (By.XPATH, "//button[contains(text(), 'View Transaction Receipt')]")

    def __init__(self, driver, base_url="https://digipe.vercel.app"):
        super().__init__(driver)
        self.base_url = base_url.rstrip("/")
        self.url = f"{self.base_url}/user/transferfunds"

    def load(self):
        """Navigates directly to the Transfer Funds page."""
        self.open(self.url)
        return self

    def select_first_source_account(self):
        """Selects the first linked account from the list if on the account selection view."""
        if self.is_visible(self.SOURCE_ACCOUNT_CARDS, timeout=5):
            self.click(self.SOURCE_ACCOUNT_CARDS)

    def fill_transfer_form(self, to_acc, ifsc, firstname, lastname, amount, description="Test Transfer"):
        """Fills all fields in the transfer form."""
        self.type(self.TO_ACCOUNT_INPUT, to_acc)
        self.type(self.IFSC_INPUT, ifsc)
        self.type(self.FIRSTNAME_INPUT, firstname)
        self.type(self.LASTNAME_INPUT, lastname)
        self.type(self.AMOUNT_INPUT, str(amount))
        self.type(self.DESCRIPTION_INPUT, description)

    def click_transfer(self):
        """Clicks the main 'Transfer Funds' button to open the MPIN prompt."""
        self.click(self.TRANSFER_SUBMIT_BUTTON)

    def is_submit_button_disabled(self):
        """Checks if the Transfer Funds button is disabled to prevent duplicate clicks."""
        btn = self.find(self.TRANSFER_SUBMIT_BUTTON)
        return btn.get_attribute("disabled") is not None

    def enter_mpin(self, pin="1234"):
        """Enters the 4-digit MPIN using the virtual on-screen keypad buttons."""
        self.find(self.MPIN_MODAL)
        for digit in str(pin):
            digit_btn = (By.XPATH, f"//button[normalize-space()='{digit}']")
            self.click(digit_btn)

    def confirm_mpin(self):
        """Clicks the 'Confirm' button in the MPIN modal."""
        self.click(self.CONFIRM_PIN_BUTTON)

    def is_mpin_modal_locked_or_submitting(self):
        """Checks if the MPIN keypad / confirm button is locked during transit."""
        btn = self.find(self.CONFIRM_PIN_BUTTON)
        return btn.get_attribute("disabled") is not None or "opacity" in btn.get_attribute("class")

    def is_success_displayed(self, timeout=10):
        """Checks if the transaction success confirmation modal appears."""
        return self.is_visible(self.SUCCESS_MODAL, timeout=timeout)
