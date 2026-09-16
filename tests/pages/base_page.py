"""
base_page.py - The Parent Class for All Page Objects
-----------------------------------------------------
What is a BasePage?
In the Page Object Model (POM), every web page shares common actions:
- Clicking a button
- Typing into an input field
- Reading text
- Waiting for elements to appear

Instead of writing `WebDriverWait(driver, 10)...` over and over in every test,
we put those common actions here in BasePage. All other pages (LoginPage,
SignupPage, DashboardPage) will inherit from this class.
"""

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


class BasePage:
    def __init__(self, driver, timeout=10):
        """
        Initialize the page with the Selenium driver.
        :param driver: The WebDriver instance passed from pytest fixture
        :param timeout: Maximum seconds to wait for elements (default 10s)
        """
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self, url):
        """Navigates the browser to a given URL."""
        self.driver.get(url)

    def find(self, locator):
        """
        Waits until an element is visible on the screen, then returns it.
        :param locator: A tuple, e.g. (By.CSS_SELECTOR, "input[type='email']")
        """
        return self.wait.until(EC.visibility_of_element_located(locator))

    def click(self, locator):
        """
        Waits until an element is clickable, then clicks it.
        :param locator: A tuple, e.g. (By.XPATH, "//button[@type='submit']")
        """
        element = self.wait.until(EC.element_to_be_clickable(locator))
        element.click()

    def type(self, locator, text):
        """
        Clears existing text from an input field and types the new text.
        :param locator: A tuple locating the input field
        :param text: The string to type into the field
        """
        element = self.find(locator)
        element.clear()
        element.send_keys(text)

    def get_text(self, locator):
        """
        Retrieves the visible text of an element.
        :param locator: A tuple locating the element
        :return: String containing the visible text
        """
        return self.find(locator).text.strip()

    def is_visible(self, locator, timeout=5):
        """
        Checks if an element is currently visible on the page.
        Returns True if found within timeout, or False if not.
        """
        try:
            custom_wait = WebDriverWait(self.driver, timeout)
            custom_wait.until(EC.visibility_of_element_located(locator))
            return True
        except (TimeoutException, NoSuchElementException):
            return False

    def get_current_url(self):
        """Returns the current URL loaded in the browser."""
        return self.driver.current_url

    def wait_for_url_contains(self, text, timeout=10):
        """
        Waits until the browser's URL contains a specific keyword.
        Example: wait_for_url_contains("/user/dashboard")
        """
        return WebDriverWait(self.driver, timeout).until(EC.url_contains(text))

    def is_input_valid(self, locator):
        """
        Uses JavaScript to check HTML5 browser validation (e.g. required, email format).
        Returns True if input passes HTML5 validation, False if browser flags it as invalid.
        """
        element = self.driver.find_element(*locator)
        return self.driver.execute_script("return arguments[0].checkValidity();", element)
