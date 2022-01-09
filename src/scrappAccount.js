const puppeteer = require('puppeteer');
fs = require('fs');

async function scrappAccount(page, url){
        await page.goto('https://www.brainmap.ro' + url)

        const details = {
            'keywords':[],
            'country': [],
            'affiliations': [],
            'roles':[],
            'name':[]
        }

        const myfunction = async (text) => {
            return await page.evaluate((text) => {
                let results = [];
                let items = document.querySelectorAll(text);
                items.forEach((item) => {
                    let content = item.innerText.split(" | ")
                    results.push(...content);
                });
                return results;
            }, text);
        }

        details.keywords = await myfunction('a.key_tag');
        details.country = await myfunction("[id*=\"idTaraLucru\"]");
        details.affiliations = await myfunction("div.profile-dash h5 label[id*=\"instNume\"]");
        details.roles = await myfunction("label[id*=\"roles\"]");
        details.name = await myfunction("[id*=\"Name\"]");

        return details;
}

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
    let urls = [
        '/bogdan-marian-diaconu'
      ];

    const accountInfo = [];
   
    for (let i = 0; i < urls.length; i++) {
        accountInfo.push(await scrappAccount(page, urls[i]));        
    };

    console.log(accountInfo)

    // fs.writeFile('AccountInfo.json', accountInfo, function (err) {
    // if (err) return console.log(err);
    // // console.log('Hello World > helloworld.txt');
    // });

    await browser.close()
   })()

/*  2 - For each next page:
        -> show each profile name + link : a class="btnProfileSearch" + href
        -> click on the next page : a : tablePageNumberUnselected & text for a > crt+1
*/