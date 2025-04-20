const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { getTextContent, navigateToPage } = require('./helper');

const website = process.argv[2];
const leagues = process.argv[3];
const myTeamName = process.argv[4];
const saveLocation = process.argv[5];
const chromePath = process.argv[6];

async function getSeason(page) {
    const pageTitleText = await getTextContent(page, "#title-info")
  
    const cleaned = pageTitleText.trim().split('\n')[1].trim();  // "Spring 2025  -  Basketball - Adult"
    let [season, year] = cleaned.split(' ').slice(0, 2);
    season = season.trim();
    year = year.trim();
    return [year, season]
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

        let season_data = {"games": [], "league": "Hamilton"}

        const [year, season] = await getSeason(page);
    
        season_data.season = `${year} ${season}`
    
        const weeks = await page.$$(`.week-container`);
    
        for (const week of weeks) {
            const noGame = await week.$(`.cell.comment-only`)
            if (noGame) {
                continue;
            }

            let gameObj = {}

            date_no_year = await getTextContent(week, `.e-date`)
            
            gameObj.date = date_no_year + `, ${year}`
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
