"""
dashboard_page.py - Page Object for the Dashboard Screen (/user/dashboard)
-------------------------------------------------------------------------
Encapsulates elements on the main logged-in dashboard:
- Welcome banner ('Welcome back, John Doe')
- Linked accounts section
- Quick actions
"""

from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class DashboardPage(BasePage):
    # ==========================================
    # 1. Locators (Matches DigiPe's Dashboard.jsx)
    # ==========================================
    WELCOME_HEADER = (By.XPATH, "//h1[contains(text(), 'Welcome back')]")
    LINKED_ACCOUNTS_HEADER = (By.XPATH, "//h3[contains(text(), 'Your Linked Accounts')]")
    QUICK_ACTIONS_HEADER = (By.XPATH, "//h3[contains(text(), 'Quick Actions')]")

    def __init__(self, driver, base_url="http://localhost:5173"):
        super().__init__(driver)
        self.url = f"{base_url.rstrip('/')}/user/dashboard"

    # ==========================================
    # 2. Verification Methods
    # ==========================================
    def is_loaded(self, timeout=10):
        """Checks if the dashboard has successfully loaded."""
        return self.is_visible(self.WELCOME_HEADER, timeout=timeout)

    def get_welcome_text(self):
        """Returns the welcome greeting text, e.g. 'Welcome back, John Doe'."""
        return self.get_text(self.WELCOME_HEADER)

    def is_linked_accounts_visible(self):
        """Checks if the 'Your Linked Accounts' section is displayed."""
        return self.is_visible(self.LINKED_ACCOUNTS_HEADER)
