const puppeteer = require('puppeteer');
fs = require('fs');


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
        '/florin-pop',      
        '/monica-turturean',
        '/irinel-casian-botez',
        '/sergiu-coseri',
        '/emil-alexandru-brujan',
        '/tudor-luchian',
        '/alexander-baumgarten',
        '/bogdan-ichim',
        '/gavril-sabau',
        '/crisanta-alina-mazilescu',
        '/liviu-marin',
        '/catalin-croitoru',
        '/dana-cristea',
        '/gina-raluca-guse',
        '/gigel-militaru',
        '/mihai-oltean',
        '/robert-ianos',
        '/diana-trandabat',
        '/goga-nicolae',
        '/public-profile-8628',
        '/mihail-ionescu',
        '/iordache-virgil-alexandru',
        '/simona-r-soare',
        '/mihail-anton',
        '/aurora-neagoe',
        '/razvan-diaconescu',
        '/mihaela-badea-doni',
        '/lucretiu-birliba',
        '/ruxandra-oana-jurcut',
        '/cristinca-fulga',
        '/carmen-buzea',
        '/razvan-saftoiu',
        '/raluca-nicoleta-balatchi',
        '/cristian-oara',
        '/ciprian-mihai-dobre',
        '/frantz-daniel-fistung',
        '/attila-bende',
        '/gabriela-marinoschi',
        '/bogdan-donose',
        '/mircea-darabantu',
        '/serban-peteu',
        '/andreea-luiza-badin',
        '/cristian-enache',
        '/petre-ionita',
        '/ligia-munteanu',
        '/mihaela-tofan',
        '/iuliana-aprodu',
        '/emil-marin-popa',
        '/ion-albulescu',
        '/marcel-dirja',
        '/miruna-mihaela-beldiman',
        '/alpar-simon',
        '/sebastian-burciu',
        '/radu-fechete',
        '/lucian-parvulescu',
        '/public-profile-8616',
        '/bogdan-ion',
        '/public-profile-8619',
        '/ionel-popa',
        '/luminita-andronic'
      ];

    const accountInfo = [];
   
    for (let i = 0; i < urls.length; i++) {

        pageURL = 'https://www.brainmap.ro' + urls[i]
        await page.goto(pageURL)

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

        accountInfo.push(details);        
    };

    console.log(accountInfo)

    fs.writeFile('AccountInfo.json', accountInfo, function (err) {
    if (err) return console.log(err);
    // console.log('Hello World > helloworld.txt');
    });

    await browser.close()
   })()

/*  2 - For each next page:
        -> show each profile name + link : a class="btnProfileSearch" + href
        -> click on the next page : a : tablePageNumberUnselected & text for a > crt+1
*/