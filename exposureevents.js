const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { getTextContent } = require('./helper');

// For expsure events, I have to go straight to the website because it is difficult to navigate their site
const website = process.argv[2];
const season = process.argv[3];
const myTeamName = process.argv[4];
const saveLocation = process.argv[5];
const chromePath = process.argv[6];

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

        let season_data = {"games": [], "league": "Legacy Park"}
    
        season_data.season = season
    
        const weeksContainer = await page.$(`div[data-bind="foreach: games"]`);
        const week_data = await weeksContainer.$$(`:scope > div`);
        // First div is the data of the game, second div is the score

        for (let ii = 0; ii < week_data.length; ii = ii+2) {
            let gameObj = {}
            const date = week_data[ii]
            const dateText = await getTextContent(date, `span`)
            let date_arr = dateText.split(" ")
            gameObj.date = date_arr.slice(1, date_arr.length).join(" ")

            const scorecard = week_data[ii+1]
            const score_body = await scorecard.$(`.card-body`)
            const scores = await score_body.$$(`:scope > div`)

            for (const score of scores) {
                let teamName = await getTextContent(score, `a`)
                teamName = teamName.trim()
                if (teamName !== myTeamName) {
                    gameObj.opponent = teamName;
                }
                const num = await getTextContent(score, `.final-score`)
                if (teamName !== myTeamName) {
                    gameObj.theirScore = num;
                } else {
                    gameObj.ourScore = num;
                }
                
            }

            season_data.games.push(gameObj)
        }

        fs.writeFileSync(`${saveLocation}\\season_data_${season_data.season}_${myTeamName}.json`, JSON.stringify(season_data, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        const pages = await browser.pages();
        await Promise.all(pages.map(page => page.close()));
        await browser.close();
    }
})();
