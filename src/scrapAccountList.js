const puppeteer = require('puppeteer');


(async () => {

    //1 - Click On search to get the first page with profiles
    const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--disable-extensions-except=/path/to/manifest/folder/',
          '--load-extension=/path/to/manifest/folder/',
        ]
      });
    const page = await browser.newPage()
    await page.goto('https://www.brainmap.ro/')

    await page.click('input.btn-lp-search')
    await page.waitForSelector('div.linkProfile')
    
    let mylist = [];
    await page.waitForTimeout(4000);
    let firstPage = await page.evaluate(() => {
        let results = [];
        let items = document.querySelectorAll('div.container-search-button a.btnProfileSearch');
        items.forEach((item) => {
            let people = {
                url:  item.getAttribute('href')
            }
            results.push(people);
        });
        return results;
    });
    mylist.push(...firstPage)
        
    for (let j = 2; j < 7; j++){
        await page.waitForTimeout(10000);
        const elements = await page.$x("//*[@class='tablePageNumberUnselected' and contains(., '" + j + "')]");
        await elements[0].click();
        await page.waitForTimeout(4000);
        await page.waitForXPath("//*[@class='tablePageNumberSelected' and contains(., '" + j + "')]");

        snd = await page.evaluate(() => {
            let results = [];
            let items = document.querySelectorAll('div.container-search-button a.btnProfileSearch');
            items.forEach((item) => {
                let people = {
                    url: item.getAttribute('href')
                }
                results.push(people);
            });
            return results;
        });
        mylist.push(...snd)
    }

    console.log(mylist)
    await browser.close()
   })()

/*  2 - For each next page:
        -> show each profile name + link : a class="btnProfileSearch" + href
        -> click on the next page : a : tablePageNumberUnselected & text for a > crt+1
*/