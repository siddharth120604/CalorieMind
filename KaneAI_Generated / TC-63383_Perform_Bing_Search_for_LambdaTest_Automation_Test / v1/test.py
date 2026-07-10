
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait,Select
from selenium.webdriver.support import expected_conditions as EC
import time,requests,re,os, traceback
try:
    from condition import Condition, ResolvedCondition, ConcatenationOperator
except Exception as e:
    pass
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from lambdatest_selenium_driver import smartui_snapshot
options = webdriver.ChromeOptions()
options.add_argument("--disable-infobars")
driver = webdriver.Chrome(options=options)
try:

    actions = ActionChains(driver)
    def get_element(driver,locators):
        driver.implicitly_wait(6)
        if isinstance(locators[0], str):
            for locator in locators:
                try:
                    element = driver.find_element(By.XPATH, locator)
                    if element.is_displayed() and element.is_enabled():
                        return element
                except:
                    continue
        else:
            for locator in locators:
                by_method = By.XPATH if str(locator['isXPath']).lower() == "true" else By.CSS_SELECTOR
                try:
                    element = driver.find_element(by_method, locator['selector'])
                    if element.is_displayed() and element.is_enabled():
                        return element
                except:
                    continue
        return None
    driver.implicitly_wait(6)

    # Step - 1 : Open URL https://www.bing.com
    driver.get("https://www.bing.com")
    driver.implicitly_wait(6)

    # Step - 2 : Get current page URL → {{current_url}}
    current_url = driver.current_url

    print("current_url:", current_url)
    driver.implicitly_wait(6)

    # Step - 3 : Assert {{current_url}} equals https://www.bing.com
    current_url = driver.current_url

    print("current_url:", current_url)
    driver.implicitly_wait(6)

    # Step - 4 : Type 'LambdaTest automation testing' in Bing search box
    element_locators = ["//textarea[@id='sb_form_q' and @name='q']", "//textarea[@name='q' and @type='search']", "//textarea[@type='search' and @role='combobox']", '#sb_form_q', '[placeholder="Search the web"][name="q"]', '[placeholder="Search the web"][role="combobox"]', '[placeholder="Search the web"][type="search"]', "//textarea[@placeholder='Search the web' and @type='search']", "//textarea[@placeholder='Search the web' and @aria-label='Enter your search here - Search suggestions will show as you type']", '[placeholder="Search the web"][aria-label="Enter your search here - Search suggestions will show as you type"]', "//textarea[contains(@type,'search')]"]
    element = get_element(driver,element_locators)

    try:
        element.click()
    except:
        driver.execute_script("arguments[0].click();", element)
    driver.execute_script("arguments[0].value = '';", element)
    if element.get_attribute("pattern") and '[0-9]{2}' in element.get_attribute("pattern"):
        for char in 'LambdaTest automation testing':
            element.send_keys(char)
    else:
        element.send_keys('LambdaTest automation testing')
    driver.implicitly_wait(6)

    # Step - 5 : Press Enter key in search box
    element_locators = ["//textarea[@id='sb_form_q' and @name='q']", "//textarea[@name='q' and @type='search']", "//textarea[@type='search' and @role='combobox']", '#sb_form_q', '[placeholder="Search the web"][name="q"]', '[placeholder="Search the web"][role="combobox"]', '[placeholder="Search the web"][type="search"]', "//textarea[@placeholder='Search the web' and @type='search']", "//textarea[@placeholder='Search the web' and @aria-label='Enter your search here - Search suggestions will show as you type']", "//textarea[text()='LambdaTest automation testing']", '[placeholder="Search the web"][aria-label="Enter your search here - Search suggestions will show as you type"]', "//textarea[contains(@type,'search')]"]
    element = get_element(driver,element_locators)

    element.send_keys(Keys.ENTER)

    driver.quit()
except Exception as e:
    driver.quit()
