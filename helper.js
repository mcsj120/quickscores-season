
async function getTextContent(root, selector) {
    const element = await root.$(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    return await element.evaluate(el => el.textContent);
}
exports.getTextContent = getTextContent;

/**
 * Navigates to a page based on the link text
 * $x - Evaluates the XPath and returns an array of elements that match the query
 * //a[contains(text(), '${leagues}')]
 * // - Represents it can be anywhere on the page
 * a - Represents an anchor tag\
 * [] represents a predict or filter on the previous details
 * contains(text(), '${leagues}') - Represents the text of the link you want to navigate to
 * @param {*} page Represents the current page you are on
 * @param {*} link_text Represents the text of the link you want to navigate to
 */

async function navigateToPage(page, link_text) {

    const linkHandlers = await page.$$(`a`);

    for (const linkHandler of linkHandlers) {
        const linkText = await page.evaluate(el => el.textContent, linkHandler);
        if (linkText.includes(link_text)) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                linkHandler.click()
            ]);
            console.log(`Navigated to the page for league: ${link_text}`);
            return;
        }
    }

    throw new Error(`No link found for league: ${link_text}`);
}
exports.navigateToPage = navigateToPage;

