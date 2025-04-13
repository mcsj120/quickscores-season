const puppeteer = require('puppeteer-core');
const fs = require('fs');

const website = process.argv[2];
const leagues = process.argv[3];
const myTeamName = process.argv[4];
const saveLocation = process.argv[5];
const chromePath = process.argv[6];

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
        return
      }
    }

    throw new Error(`No link found for league: ${link_text}`);
}

async function getSeason(page) {
    const pageTitleText = await getTextContent(page, "#title-info")
  
    const cleaned = pageTitleText.trim().split('\n')[1].trim();  // "Spring 2025  -  Basketball - Adult"
    let [season, year] = cleaned.split(' ').slice(0, 2);
    season = season.trim();
    year = year.trim();
    return `${year} ${season}`
}

async function getTextContent(root, selector) {
    const element = await root.$(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    return await element.evaluate(el => el.textContent);
}


(async () => {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      args: ['--window-position=0,0'] // Adjust the position to specify the monitor
    });
    try{
        const page = await browser.newPage();
        await page.goto(website);
        console.log('Page loaded successfully');
    
        await navigateToPage(page, leagues);
        await navigateToPage(page, myTeamName);

        let season_data = {"games": []}
    
        season_data.season = await getSeason(page);
    
        const weeks = await page.$$(`.week-container`);
    
        for (const week of weeks) {
            const noGame = await week.$(`.cell.comment-only`)
            if (noGame) {
                continue;
            }

            let gameObj = {}

            gameObj.date = await getTextContent(week, `.e-date`)
            const teams_with_scores = await week.$$(`.team.clearfix`)

            for (const team of teams_with_scores) {
                
                let teamName = await getTextContent(team, `.team-name`)
                teamName = teamName.trim().split(":")[1].trim()
                if (teamName !== myTeamName) {
                    gameObj.opponent = teamName;
                }
                const score = await getTextContent(team, `.team-record`)
                if (teamName !== myTeamName) {
                    gameObj.theirScore = score;
                } else {
                    gameObj.ourScore = score;
                }
                
            }
            season_data.games.push(gameObj)
        }

        fs.writeFileSync(`${saveLocation}\\season_data_${season_data.season}_${myTeamName}.json`, JSON.stringify(season_data, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await browser.close();
    }
})();
