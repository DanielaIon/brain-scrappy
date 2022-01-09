const puppeteer = require('puppeteer');
var amqp = require('amqplib/callback_api');
var amqpConn = null;

function startRabbitMQ() {
    amqp.connect('amqp://localhost', function(err, conn) {
      if (err) {
        console.error("[AMQP]", err.message);
        return setTimeout(startRabbitMQ, 1000);
      }
      conn.on("error", function(err) {
        if (err.message !== "Connection closing") {
          console.error("[AMQP] conn error", err.message);
        }
      });
      conn.on("close", function() {
        console.error("[AMQP] reconnecting");
        return setTimeout(startRabbitMQ, 1000);
      });
      console.log("[AMQP] connected");
      amqpConn = conn;
      startPublisher();
    });
  }

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
  }

function publish(exchange, routingKey, content) {
    try {
      pubChannel.publish(exchange, routingKey, content, { persistent: true },
                        function(err, ok) {
                          if (err) {
                            console.error("[AMQP] publish", err);
                            offlinePubQueue.push([exchange, routingKey, content]);
                            pubChannel.connection.close();
                          }
                        });
    } catch (e) {
      console.error("[AMQP] publish", e.message);
      offlinePubQueue.push([exchange, routingKey, content]);
    }
  }

var pubChannel = null;
var offlinePubQueue = [];
function startPublisher() {
  amqpConn.createConfirmChannel(function(err, ch) {
    if (closeOnErr(err)) return;
    ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    pubChannel = ch;
    while (true && offlinePubQueue.length > 0) {

        var [exchange, routingKey, content] = offlinePubQueue.shift();
        publish(exchange, routingKey, content);
        
    }
  });
}

function publishEachAccount(accountList) {
    accountList.forEach(account => {
        publish("", "accounts", new Buffer(`${account.url}`));
    });

}
async function extractProfilesFromPage(page) {
    return page.evaluate(() => {
        const profilesPage = [];
        const elements = document.querySelectorAll('div.container-search-button a.btnProfileSearch');
        elements.forEach((element) => element.getAttribute('href') !== 'http://' && profilesPage.push({
            //Clean the url, remove the previous path if it exist ex:  https://www.brainmap.ro/simona-r-soare is /simona-r-soare
            url: "/"+(element.getAttribute('href')).split("/").pop()
        }));
        return profilesPage;
    });
}


(async() => {
    //connect to RABITMQ
    startRabbitMQ();

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
    let currentPageNumber = 1;
    while (true) {   

        publishEachAccount(await extractProfilesFromPage(page));

        currentPageNumber++;
        await page.$$eval('a.tablePageNumberUnselected', (elements, nextPageNumber) => elements.filter(e => parseInt(e.textContent) === nextPageNumber)[0].click(), currentPageNumber);
        await page.waitForNavigation()
        try {
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

    await browser.close();
})();

/*  2 - For each next page:
        -> show each profile name + link : a class="btnProfileSearch" + href
        -> click on the next page : a : tablePageNumberUnselected & text for a > crt+1
*/