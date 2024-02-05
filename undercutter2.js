const io = require('socket.io')(4200);
const io2 = require('socket.io-client');

const socket2 = io2('http://localhost:4300/')

socket2.on('connect', function () {
    console.log('socket2 connected')
});

socket2.on('snapshot', (msg) => hasSnapshot(msg))


const data = require('./data.js')
var keyPriceProfit = 79.88

var startup = 1

const pm2io = require('@pm2/io')
var pm2 = require('pm2');
const SKU = require('tf2-sku')

var snapshotListings = JSON.parse('[]')

pm2.connect(function (err) {
    if (err) throw err;

    /*setTimeout(function worker2() {
        console.log('Now restarting undercutter..')
        pm2.restart('undercutter2', function () { });
        setTimeout(worker2, 5400000)
    }, 5400000)*/
});

var showlistings = pm2io.metric({
    name: 'Compteurlistings'
})

var inventoryValue = pm2io.metric({
    name: 'Pure'
})

const request = require('requestretry');
const fs = require('fs');
const listings2 = require("./pricelist2.json") // Celui qui va être modifier par l'api
const indexfile = require('./skuList.json')
const Schema = require('tf2-schema');
const schemaManager = new Schema({ apiKey: 'APIKEY' });


var compteurlistings = 0
var proxyIndex = 0;
const proxylist = require('./proxylist.json')
var changes = null
var haschanged = 0

schemaManager.init(function (err) {
    if (err) {
        throw err;
    }
});

schemaManager.on('ready', function () {
    console.log("SchemaManager ready, starting...")
    var actionsdone = 0


    request('https://backpack.tf/api/classifieds/search/v1?appid=440&item=Mann%20Co.%20Supply%20Crate%20Key&quality=6&tradable=1&craftable=1&australium=-1&killstreak_tier=0&key=', {
        json: true
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        var i = 0
        var o = 0
        try {
            while (body.buy.total > o) {
                if (body.buy.listings[o].automatic == 1) {
                    var buy = body.buy.listings[o].currencies.metal
                    o = body.buy.total
                } else o++

            }
            while (body.sell.total > i) {
                if (body.sell.listings[i].automatic == 1) {
                    var sell = body.sell.listings[i].currencies.metal
                    i = body.sell.total
                } else i++
            }
        } catch (err) {
            if (err) {
                buy = null
                sell = null
            }
        }
        if (buy > sell) {
            buy = null
            sell = null
        }
        console.log(`Buy key = ${buy}, sell key = ${sell}`)
        if (buy == null || sell == null || buy == undefined || sell == undefined) {
            keyPrice = null
            console.log('KeyPrice is wrong, nullified...')
        } else {
            if (buy > sell || (buy < 60 || sell < 60)) {

                keyPrice = null
                fs.writeFileSync('OwnKeyPrice.json', `{"buy":null,"sell":null}`)
                console.log('Now Starting Items Refresh')
                request.post({
                    url: 'https://api2.prices.tf/auth/access'
                },
                    function (err, res, body) {
                        body = JSON.parse(body)
                        request.get({
                            url: 'https://api2.prices.tf/prices/5021;6',
                            headers: {
                                Authorization: `Bearer ${body.accessToken}`
                            }
                        },
                            function (err, res, body) {
                                body = JSON.parse(body)
                                keyPriceProfit = body
                                keyPriceProfit = ((body.sellHalfScrap / 2) * 0.111111).toFixed()
                                doe()
                                return
                            })
                    }
                )
            }
            if (buy == sell) {
                sell += 0.11
                let sellRest = sell % 1
                sell = Math.trunc(sell)
                if (0.09 < sellRest && sellRest < 0.13) { sellRest = 0.11 }
                if (0.20 < sellRest && sellRest < 0.24) { sellRest = 0.22 }
                if (0.31 < sellRest && sellRest < 0.35) { sellRest = 0.33 }
                if (0.42 < sellRest && sellRest < 0.46) { sellRest = 0.44 }
                if (0.53 < sellRest && sellRest < 0.57) { sellRest = 0.55 }
                if (0.64 < sellRest && sellRest < 0.68) { sellRest = 0.66 }
                if (0.75 < sellRest && sellRest < 0.79) { sellRest = 0.77 }
                if (0.86 < sellRest && sellRest < 0.90) { sellRest = 0.88 }
                if (sellRest > 0.91) { sellRest = 1 }
                sell = sell + sellRest
            }
        }
        var keyPrice = `{"buy":{"keys":0,"metal":${buy}},"sell":{"keys":0,"metal":${sell}},"src":"ptf","time":${Date.now() / 1000 | 0}}`
        console.log(`Found keyprice : ${keyPrice}`)
        fs.writeFileSync('OwnKeyPrice.json', keyPrice)
        console.log('Now Starting Items Refresh !!')
        request.post({
            url: 'https://api2.prices.tf/auth/access'
        },
            function (err, res, body) {
                body = JSON.parse(body)
                request.get({
                    url: 'https://api2.prices.tf/prices/5021;6',
                    headers: {
                        Authorization: `Bearer ${body.accessToken}`
                    }
                },
                    function (err, res, body) {
                        body = JSON.parse(body)
                        keyPriceProfit = body
                        keyPriceProfit = ((body.sellHalfScrap / 2) * 0.111111).toFixed()
                        doe()
                        return
                    })
            }
        )

    })






})


function doe() {
    var passed = 0;
    haschanged = 0

    if (globalThis.lastWasSnapshot && snapshotListings.length == 0) { // Done going through snapshotlists
        compteurlistings = globalThis.compteurlistings
        globalThis.lastWasSnapshot = false;
    } else if (globalThis.lastWasSnapshot && snapshotListings.length != 0) { // Snapshotlistings still has elements BUT we need to keep compteurlistings untouched
        // Don't do anything
    } else { // Going through snapshot, previous compteurlistings is good and lastWasSnapshot was false
        globalThis.lastCompteurListings = compteurlistings
        globalThis.lastWasSnapshot = true

    }

    if (snapshotListings.length != 0) {
        compteurlistings = 0
        while (listings2[compteurlistings].sku != snapshotListings[0].sku) {
            compteurlistings++
        }
    }


    const show = 0
    try {
        var inventory = JSON.parse(fs.readFileSync('./inventory.json'))
        var listings = JSON.parse(fs.readFileSync("./pricelist.json")) // Celui à demander à l'api, acualisé à chaque demande
    } catch (e) {
        console.log('Catched an error: ' + e)
        if (e) {
            var listings = fs.readFileSync("./pricelist.json", 'utf8');
            while (listings.slice(-7) != "false}}") {
                console.log(listings.slice(-7))
                var listings = listings.slice(0, -1)
            }
            fs.writeFileSync('./pricelist.json', listings)
            console.log('Corrected file error')
            doe()
            return;
        }
    }



    if (compteurlistings == indexfile.length) {
        compteurlistings = 0;
        startup = 0;
        console.log('reseting compteurlistings')
    }

    if (proxyIndex == 10) {
        proxyIndex = 0;
        console.log('reseting proxyIndex')
    }



    showlistings.set(compteurlistings);

    const sku = indexfile[compteurlistings]


    var item = SKU.fromString(sku)
    var name = schemaManager.schema.getName(item);
    const nname = name;

    if (name.startsWith('Strange Part')) {
        //console.log(`C'est strange part tranquile mate`)
    } else if (name.startsWith("Strange Professional Killstreak ")) {
        name = name.replace("Strange Professional Killstreak ", "")

    } else if (name.startsWith('Strange Specialized Killstreak ')) {
        name = name.replace('Strange Specialized Killstreak ', '')

    } else if (name.startsWith('Strange Killstreak ')) {
        name = name.replace('Strange Killstreak ', '')

    } else if (name.startsWith("Strange ")) {
        name = name.replace('Strange ', '')

    } else if (name.startsWith('Genuine Professional Killstreak ')) {
        name = name.replace('Genuine Professional Killstreak ', '')

    } else if (name.startsWith('Genuine Specialized Killstreak ')) {
        name = name.replace('Genuine Specialized Killstreak ', '')

    } else if (name.startsWith('Genuine Killstreak ')) {
        name = name.replace('Genuine Killstreak ', '')

    } else if (name.startsWith('Genuine ')) {
        name = name.replace('Genuine ', '')

    } else if (name.startsWith('Vintage Professional Killstreak ')) {
        name = name.replace('Vintage Professional Killstreak ', '')

    } else if (name.startsWith('Vintage Specialized Killstreak ')) {
        name = name.replace('Vintage Specialized Killstreak ', '')

    } else if (name.startsWith('Vintage Killstreak ')) {
        name = name.replace('Vintage Killstreak ', '')

    } else if (name.startsWith('Vintage ')) {
        name = name.replace('Vintage ', '')

    } else if (name.startsWith('Haunted Professional Killstreak ')) {
        name = name.replace('Haunted Professional Killstreak ', '')

    } else if (name.startsWith('Haunted Specialized Killstreak ')) {
        name = name.replace('Haunted Specialized Killstreak ', '')

    } else if (name.startsWith('Haunted Killstreak ')) {
        name = name.replace('Haunted Killstreak ', '')

    } else if (name.startsWith('Haunted ')) {
        name = name.replace('Haunted ', '')

    } else if (name.startsWith('Professional Killstreak ')) {
        name = name.replace('Professional Killstreak ', '')
    } else if (name.startsWith('Specialized Killstreak ')) {
        name = name.replace('Specialized Killstreak ', '')
    } else if (name.startsWith('Killstreak ')) {
        name = name.replace('Killstreak ', '')
    } else if (name == 'Haunted The Haunted Hat') {
        name = "The Haunted hat"
    }

    if (name.includes('Australium ')) {
        name = name.replace('Australium ', '')
    }

    if (item.craftable == true) {
        var craft = 1;
    } else {
        var craft = 0;;
    }

    if (item.australium == true) {
        var aussie = 1;
    } else {
        var aussie = -1;
    }

    if (!name.includes('Taunt')) {
        name = name.replace('The ', '')
    }

    name = name.replace('Non-Craftable ', '')


    if (item.effect == null) {
        var url = `https://backpack.tf/api/classifieds/search/v1?appid=440&item=${name}&craftable=${craft}&priceindex=0&key=&australium=${aussie}&quality=${item.quality}&killstreak_tier=${item.killstreak}&page_size=30`
    } else {
        var url = `https://backpack.tf/api/classifieds/search/v1?appid=440&item=${name.replace(`${data.effect[item.effect]} `, '')}&craftable=${craft}&priceindex=0&key=&australium=${aussie}&quality=${item.quality}&particle=${item.effect}&killstreak_tier=${item.killstreak}&page_size=30`
    }




    /*try {
        if (inventory["5021;6"].length)
            if (inventory["5002;6"].length)
                passed = 1
    }
    catch (err) {
        if (err) {
            passed = 0
        }
    }

    if (passed) {*/
    var metal = 0
    var ScrapLeft = 0
    var keys = 0

    if (inventory.hasOwnProperty('5021;6')) {
        keys = inventory["5021;6"].length
    }

    if (inventory.hasOwnProperty('5002;6')) {
        metal += inventory["5002;6"].length
    }
    if (inventory.hasOwnProperty('5001;6')) {
        metal += Math.trunc(inventory["5001;6"].length * 0.3333)
        ScrapLeft += (inventory["5001;6"].length * 0.3333) % 1
    }
    if (inventory.hasOwnProperty('5000;6')) {
        metal += Math.trunc(inventory["5000;6"].length * 0.1111)
        ScrapLeft += (inventory["5000;6"].length * 0.1111) % 1
    }
    metal += Math.trunc(ScrapLeft)
    if (0.09 < ScrapLeft % 1 && ScrapLeft % 1 < 0.13) { ScrapLeft = 0.11 }
    if (0.20 < ScrapLeft % 1 && ScrapLeft % 1 < 0.24) { ScrapLeft = 0.22 }
    if (0.31 < ScrapLeft % 1 && ScrapLeft % 1 < 0.35) { ScrapLeft = 0.33 }
    if (0.42 < ScrapLeft % 1 && ScrapLeft % 1 < 0.46) { ScrapLeft = 0.44 }
    if (0.53 < ScrapLeft % 1 && ScrapLeft % 1 < 0.57) { ScrapLeft = 0.55 }
    if (0.64 < ScrapLeft % 1 && ScrapLeft % 1 < 0.68) { ScrapLeft = 0.66 }
    if (0.75 < ScrapLeft % 1 && ScrapLeft % 1 < 0.79) { ScrapLeft = 0.77 }
    if (0.86 < ScrapLeft % 1 && ScrapLeft % 1 < 0.90) { ScrapLeft = 0.88 }
    if (0.98 < ScrapLeft % 1) { ScrapLeft = 1 }
    if (0.02 > ScrapLeft % 1 && ScrapLeft != 1) { ScrapLeft = 0 }
    metal += ScrapLeft
    inventoryValue.set(`${keys} keys and ${metal} metal`)

    var match2 = matchi2(sku)

    let m2keyprofit = match2.sell.keys - match2.buy.keys // Nombre de clés en dehors des clés à la vebte moins à l'achat == NOMBRE DE CLES DE BENEFICE

    let m2keyprofitinref = m2keyprofit * keyPriceProfit // mkeyprofit = Clés, donc nombre de clés fois le prix de la clé
    let m2refprofit = match2.sell.metal - match2.buy.metal // Nombre de ref en dehors des clés à la vente moins à l'achat
    let m2profit = m2keyprofitinref + m2refprofit // PROFIT !!!

    let priceInRef = match2.buy.keys * keyPriceProfit + match2.buy.metal
    let weHaveInRef = keys * keyPriceProfit + metal


    if ((priceInRef > weHaveInRef || match2.buy.keys > keys || m2profit < 50) && startup == 0) { // if amount of keys is good then check if enough metal
        try {
            if (inventory[`${listings[sku].sku}`].length >= 1) { // We have the item, looking for prices in order to sell
                //console.log(`OK looking for ${nname} since we have it`)
            } else {
                //console.log("not ok")
            }
        } catch (err) { // We don't have the item. 
            if (err) {
                //console.log(`Don't have ${nname}, insufficient funds, skipping...`)
                compteurlistings++;
                doe()
                return;
            }
        }
    }


    if (item.quality == 5 && !name.includes("Horseless")) {
        compteurlistings++;
        console.log("Fuck unusuals");
        doe();
        return;
    }


    console.log(`${nname}`)
    /*if (nname !== 'Strange Professional Killstreak Stickybomb Launcher') {
        compteurlistings++;
        doe();
        return
    }*/


    request(url, {
        json: true,
        proxy: `${proxylist[proxyIndex].proxy}`,
        maxAttempts: 5,
        retryDelay: 5000
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        if (typeof (body.message) == 'string') {
            if (body.message.includes('Request limit exceeded')) {
                let timetowait = body.message.replace('Request limit exceeded: this endpoint only allows 60 calls per 60 seconds per API key. Try again in ', '')
                timetowait = timetowait.replace(' seconds.')
                timetowait = parseInt(timetowait)
                console.log(`Limit exceeded ! Waiting ${timetowait}...`)
                setTimeout(doe, timetowait * 1000)
                return;
            } else if (body.message.includes('503 Service Temporarily Unavailable')) {
                console.log(`Service temporarily unavailable ! Refreshing...`)
                setTimeout(doe, 100)
                return;
            }
        }

        /*if (realname == 'Strange Professional Killstreak Australium Rocket Launcher') { /////////////////////////////////////////////////////////////////////////////// !!!!! REMOVE !!!!!!! ////////////////////////////
          doe()
          return;
        }*/


        // fs.appendFileSync(`listiings.json`, `if (nom == "${listings2[sku].name}") {var p = ${sku}}\n`)

        //  console.log(url)
        listings2[sku].time = Math.floor(Date.now() / 1000)


        var i = 0
        try {
            var max = body.buy.total // PLANTE ?!
        } catch (err) {
            if (err) {
                setTimeout(doe, 500)
                compteurlistings -= 1
                console.log(`Error\n\n\n\n\n !i!i!i!i!i!i!i!i!i!i!i!i\n\n\n ${err}\n\n\n\n\n`)
                console.log(body)
                return;
            }
        }
        while (i < 100) {// total des BUY ou SELL OU automatic !== 1


            if (max == 0 || i == max || max < i) {

                if (listings[sku].buy == null) {
                    var bk = 0
                    var bm = 0
                } else {
                    var bk = listings[sku].buy.keys
                    var bm = listings[sku].buy.metal
                }

                if (listings2[sku].prices == null) {
                    doe()
                    return;
                }

                if (listings2[sku].buy.keys == bk && listings2[sku].buy.metal == bm) {
                    sell()
                    return;
                }
                listings2[sku].buy = {
                    keys: bk,
                    metal: bm
                }
                listings2[sku].time = Math.floor(Date.now() / 1000)
                let data = JSON.stringify(listings2);
                fs.writeFileSync('./pricelist2.json', data);

                var CurrentTime = Math.floor(Date.now() / 1000)

                changes = `{"sku":"${listings2[sku].sku}","name":"${name}","source":"undercutter","currency":null,"buy":{"keys":${listings2[sku].buy.keys},"metal":${listings2[sku].buy.metal}},"sell":{"keys":${listings2[sku].sell.keys},"metal":${listings2[sku].sell.metal}},"time":${CurrentTime}}`

                setTimeout(sell, 12)
                return;
            }

            try {
                body.buy.listings[i].steamid
            } catch (e) {
                if (e) {
                    console.log(`Impossible de lire "steamid" à la position ${compteurlistings}`)
                    sell()
                    return;
                }
            }

            if (body.buy.listings[i].item.name.includes('Festivized') && !body.buy.listings[i].item.name.includes('Australium')) {
                i++
            }
            else if (body.buy.listings[i].steamid == "76561198839580611") {
                i++
            }
            else if (body.buy.listings[i].automatic == 0) { // !== total des BUY ou SELL OU automatic !== 1
                i++
            } else if (body.buy.listings[i].automatic == 1 && i < body.buy.total) {
                if (body.buy.listings[i].item.hasOwnProperty('attributes')) {
                    let lengthOfAttributes = body.buy.listings[i].item.attributes.length;
                    let j = 0;
                    let finalLength = 0;

                    while (j < lengthOfAttributes) {
                        if (body.buy.listings[i].item.attributes[j].defindex == 2025 || body.buy.listings[i].item.attributes[j].defindex == 2027 || body.buy.listings[i].item.attributes[j].defindex == 142 || body.buy.listings[i].item.attributes[j].defindex == 214) {
                            finalLength++;
                        }
                        j++
                    }

                    if (lengthOfAttributes - finalLength > 0) {
                        i++;
                        console.log(`${nname} has too many attributes`)
                        continue;
                    }
                }
                //}

                var bm = body.buy.listings[i].currencies.metal
                var bk = body.buy.listings[i].currencies.keys

                if (body.buy.total < 1) {
                    var bk = listings[sku].buy.keys
                    var bm = listings[sku].buy.metal
                }

                if (body.buy.listings[i].item.name !== nname) {
                    //NOT GOING IN HERE
                    var bk = listings[sku].buy.keys
                    var bm = listings[sku].buy.metal
                }

                if (bm == undefined) {
                    var bm = 0
                }

                if (bk == undefined) {
                    var bk = 0
                }

                //   console.log("BUYKEY : " + bk)
                if (listings2[sku].buy !== null) {
                    if (listings2[sku].buy.keys == bk && listings2[sku].buy.metal == bm) {
                        // console.log('No need to do anything here')
                        // GOING HERE
                        sell()
                        return;
                    }
                    listings2[sku].buy = {
                        keys: bk,
                        metal: bm
                    }
                } else if (listings2[sku].buy == null) {
                    listings2[sku].buy = {
                        keys: listings[sku].price.buy.keys,
                        metal: listings[sku].buy.metal
                    }
                }

                listings2[sku].time = Math.floor(Date.now() / 1000)
                let data = JSON.stringify(listings2);
                fs.writeFileSync('./pricelist2.json', data);

                var CurrentTime = Math.floor(Date.now() / 1000)
                changes = `{"sku":"${listings2[sku].sku}","name":"${name}","source":"undercutter","currency":null,"buy":{"keys":${listings2[sku].buy.keys},"metal":${listings2[sku].buy.metal}},"sell":{"keys":${listings2[sku].sell.keys},"metal":${listings2[sku].sell.metal}},"time":${CurrentTime}}`

                setTimeout(sell, 12)
                return;

            } else if (body.buy.listings[i].automatic === undefined && i == max) { // Automatic == 0 ET i == total des BUY ou SELL
                sell()
                if (show == 1) {
                    return console.log("fin. " + i)
                }
            } else {
                i++
            }
        }






















        function sell() {

            var o = 0
            var max2 = body.sell.total
            while (o < 100) { // total des BUY ou SELL OU automatic !== 1

                if (max2 < o) {
                    doe()
                    return
                }

                if (max2 == 0 || o == max2 || max2 < o) {

                    if (listings[sku].sell == null) {
                        var sk = listings[sku].sell.keys
                        var sm = listings[sku].sell.metal
                        return;
                    }

                    var sk = listings[sku].sell.keys
                    var sm = listings[sku].sell.metal

                    if (listings2[sku].sell.keys == sk && listings2[sku].sell.metal == sm) {
                        doe()
                        return;
                    }

                    listings2[sku].sell = {
                        keys: sk,
                        metal: sm
                    }



                    if (show == 1) {
                        console.log("\n 299 Achat de " + nname + " pour " + JSON.stringify({
                            keys: bk,
                            metal: bm
                        }) + " et le vend pour " + JSON.stringify({
                            keys: sk,
                            metal: sm
                        }) + " Profit réalisable : " + JSON.stringify({
                            keys: sk - bk,
                            metal: sm - bm
                        }))
                    }
                    listings2[sku].time = Math.floor(Date.now() / 1000)
                    let data = JSON.stringify(listings2);
                    fs.writeFileSync('./pricelist2.json', data);

                    var CurrentTime = Math.floor(Date.now() / 1000)
                    changes = `{"sku":"${listings2[sku].sku}","name":"${name}","source":"undercutter","currency":null,"buy":{"keys":${listings2[sku].buy.keys},"metal":${listings2[sku].buy.metal}},"sell":{"keys":${listings2[sku].sell.keys},"metal":${listings2[sku].sell.metal}},"time":${CurrentTime}}`
                    listings2[sku].time = Math.floor(Date.now() / 1000)
                    setTimeout(doe, 15)
                    return;
                }

                try {
                    body.sell.listings[o].steamid
                } catch (e) {
                    if (e) {
                        console.log(`Impossible de lire "steamid" à la position ${compteurlistings}`)
                        doe()
                        return;
                    }
                }

                if (body.sell.listings[o].item.name.includes('Festivized') && !body.sell.listings[o].item.name.includes('Australium')) {
                    o++
                }
                else if (body.sell.listings[o].steamid == "76561198839580611") {
                    o++
                } else if (body.sell.listings[o].automatic == 0) {
                    o++
                } else if (body.sell.listings[o].automatic == 1 && o < body.sell.total) {
                    var sm = body.sell.listings[o].currencies.metal
                    var sk = body.sell.listings[o].currencies.keys

                    //if (body.sell.total < 1) {
                    //var sk = listings[sku].sell.keys
                    //var sm = listings[sku].sell.metal
                    //}


                    if (body.sell.listings[o].item.name !== nname && !body.sell.listings[o].item.name.includes('Festivized')) {
                        var sk = listings[sku].sell.keys
                        var sm = listings[sku].sell.metal
                    }

                    if (sm == undefined) {
                        var sm = 0
                    }

                    if (sk == undefined) {
                        var sk = 0
                    }

                    if (listings2[sku].sell.keys == sk && listings2[sku].sell.metal == sm) {
                        doe()
                        return
                    }
                    if (listings2[sku].sell !== null) {
                        if (listings2[sku].sell.keys !== sk && listings2[sku].sell.metal !== sm) {
                            listings2[sku].sell = { keys: sk, metal: sm }
                        } else if (listings2[sku].sell == null) {
                            listings2[sku].sell = {
                                keys: listings[sku].price.sell.keys,
                                metal: listings[sku].sell.metal
                            }
                        }
                    }

                    listings2[sku].sell = { keys: sk, metal: sm }

                    if (show == 1) {
                        console.log("\n 317 Achat de " + nname + " pour " + JSON.stringify({
                            keys: bk,
                            metal: bm
                        }) + " et le vend pour " + JSON.stringify({
                            keys: sk,
                            metal: sm
                        }) + " Profit réalisable : " + JSON.stringify({
                            keys: sk - bk,
                            metal: sm - bm
                        }))
                    }
                    //  listings2[sku].sell.keys = body.sell.listings[o].currencies.keys;
                    //  listings2[sku].sell.metal = body.sell.listings[o].currencies.metal;
                    listings2[sku].time = Math.floor(Date.now() / 1000)
                    let data = JSON.stringify(listings2);
                    fs.writeFileSync('./pricelist2.json', data);
                    var CurrentTime = Math.floor(Date.now() / 1000)
                    changes = `{"sku":"${listings2[sku].sku}","name":"${name}","source":"undercutter","currency":null,"buy":{"keys":${listings2[sku].buy.keys},"metal":${listings2[sku].buy.metal}},"sell":{"keys":${listings2[sku].sell.keys},"metal":${listings2[sku].sell.metal}},"time":${CurrentTime}}`
                    setTimeout(doe, 15)
                    return;


                } else if (body.sell.listings[o].automatic === undefined && o == max2) { // Automatic == 0 ET o == total des BUY ou SELL
                    doe()
                    if (show == 1) {
                        console.log("fin. " + o)
                    }
                    return;
                } else {
                    o++
                }
            }

        }
    });
    if (changes !== null) {
        io.sockets.emit('undercutter', JSON.parse(changes))
        console.log('emitted changes')
        changes = null;
    }
    compteurlistings++
    proxyIndex++
}



function hasSnapshot(data) {
    console.log(data)
}

function matchi2(sku) {
    try {
        var pricelist2 = JSON.parse(fs.readFileSync('./pricelist2.json'))
    } catch (e) {
        var pricelist2 = JSON.parse(fs.readFileSync('.pricelist2.json'))
    }
    return pricelist2[sku]
}
