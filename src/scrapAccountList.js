const puppeteer = require('puppeteer');
const amqp = require('amqplib/callback_api');

async function extractProfilesFromPage(page) {
    return page.evaluate(() => {
        const profilesPage = [];
        const elements = document.querySelectorAll('div.container-search-button a.btnProfileSearch');
        elements.forEach((element) => element.getAttribute('href') !== 'http://' && profilesPage.push({
            url: element.getAttribute('href')
        }));
        return profilesPage;
    });
}

(async() => {
    // access brainmap.ro
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.goto('https://www.brainmap.ro/');
    await page.setCookie(...[{
        'name': 'ath-consent-accepted',
        'value': 'a7d1a83349f216881133a7e5ff8c51ce253aef00-82172179051-83299499500',
    }, {
        'name': 'ath-consent',
        'value': 'accept'
    }]);

    // empty search to load first page of account list
    await page.click('input.btn-lp-search');
    await page.waitForSelector('div.linkProfile');
    await page.waitForTimeout(4000);

    // get profiles url page by page
    const profiles = [];
    let currentPageNumber = 1;
    while (true) {
        profiles.push(...await extractProfilesFromPage(page));
        console.log(`Total profiles scraped: ${profiles.length}`);

        currentPageNumber++;
        await page.$$eval('a.tablePageNumberUnselected', (elements, nextPageNumber) => elements.filter(e => parseInt(e.textContent) === nextPageNumber)[0].click(), currentPageNumber);
        await page.waitForNavigation()
        try {
            // console.log("//*[@class='tablePageNumberSelected' and contains(., '" + currentPage + "')]");
            await page.waitForTimeout(3000);
            await page.waitForXPath(
                "//*[@class='tablePageNumberSelected' and contains(., '" + currentPageNumber + "')]", {
                    timeout: 10000
                }
            );
        } catch (e) {
            console.log(`Scraping ended before page ${currentPageNumber}`);
            break;
        }
    }

    // save profiles to a csv


    await browser.close();
})();

/*  2 - For each next page:
        -> show each profile name + link : a class="btnProfileSearch" + href
        -> click on the next page : a : tablePageNumberUnselected & text for a > crt+1
*/