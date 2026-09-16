"""
conftest.py - Pytest Fixtures and Global Configuration
-------------------------------------------------------
In pytest, 'fixtures' are helper functions that prepare everything before a test runs
(like opening a browser) and clean up after it finishes (like closing the browser).

Any test function can use 'driver' or 'base_url' simply by naming them in its arguments:
    def test_example(driver, base_url):
        driver.get(base_url)
"""

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from webdriver_manager.chrome import ChromeDriverManager


def pytest_addoption(parser):
    """
    Adds custom command-line flags to pytest.
    Example usage:
        pytest --headless
        pytest --base-url http://localhost:3000
    """
    parser.addoption(
        "--headless",
        action="store_true",
        default=False,
        help="Run tests in background without opening a visible browser window."
    )
    parser.addoption(
        "--base-url",
        action="store",
        default="http://localhost:5173",
        help="Base URL of the DigiPe frontend application."
    )


@pytest.fixture(scope="session")
def base_url(request):
    """Provides the base URL of the application to any test that requests it."""
    return request.config.getoption("--base-url")


@pytest.fixture(scope="function")
def driver(request):
    """
    Fixture that initializes and provides a clean Selenium Chrome WebDriver instance
    for every test function, and automatically closes it when the test completes.
    """
    # 1. Configure Chrome options
    options = ChromeOptions()
    
    # Run without visible UI if --headless flag is passed in terminal
    if request.config.getoption("--headless"):
        options.add_argument("--headless=new")
    
    # Standard settings for smooth testing
    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    # 2. Automatically install/manage the matching ChromeDriver version
    service = ChromeService(ChromeDriverManager().install())
    browser = webdriver.Chrome(service=service, options=options)

    # 3. Set implicit wait (maximum seconds to wait when looking for elements)
    browser.implicitly_wait(5)

    # 4. Give the browser to the test function
    yield browser

    # 5. Teardown: Close the browser after test finishes
    browser.quit()
