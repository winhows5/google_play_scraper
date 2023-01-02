var gplay = require('google-play-scraper');
var fs = require('fs');
const csv = require('csv-parser');
const {category_list, dict_keys, retry_keys} = require('../const');



/* MUST be used after rank.js
*/
async function scrape_similar_retry (retry_dict, records) {
    var total = 0;
    var app_count = 0;
    for (let i = 0; i < records.length; i++) {
        let app_id = records[i].app_id;
        let category = category_list[ records[i].cat_num ];
        await gplay.similar({appId: app_id, fullDetail: true, country: retry_dict.country, throttle: 50})
        .then( v2 => {
            var result = [];
            for (let j = 0; j < v2.length; j++) {
                let dict = {
                    "app_id": v2[j].appId,
                    "app_name": "\"" + v2[j].title + "\"",
                    "app_page_url": v2[j].url,
                    "source": "snowball",
                    "source_app": app_id,
                    "rank_at_souce": j+1,
                    "rank_method": "Top Free",
                    "category": v2[j].genreId,
                    "request_date": (new Date()).toISOString().slice(0, 10)
                }
                result.push(dict);  
            }

            app_count += 1;
            total = total + result.length;
            console.log(result.length, total, " process: ", app_count);
            const app_similar_csv = result.map(item => (
                dict_keys.map(key => {
                    return item[key];
                }).join(',')
                ));
                
            const app_similar = app_similar_csv.join('\n') + '\n';
            fs.appendFileSync(retry_dict.country+"/"+category+"_"+retry_dict.country+"_"+retry_dict.lang+".csv", app_similar, console.log);
            console.log("snowball %d of Category: %d Source: %s\n", v2.length, records[i].cat_num, app_id);
        })
        .catch(() => {
            console.error("Error from %s", app_id); 
            var retry_list = [];
            retry_list.push(records[i]);
            const retry_csv = retry_list.map(item => (
                retry_keys.map(key => {
                    return item[key];
                }).join(',')
                ));
            const retry_string = retry_csv.join('\n') + '\n';
            fs.appendFileSync(retry_dict.country+"/.retry_2.csv", retry_string, console.log);
            app_count += 1;
            console.log(total, " process: ", app_count);
        })
    }
}



var records;
async function read_csv (retry_dict) {
    records = [];
    return fs.createReadStream(retry_dict.country+"/.retry_1.csv")
           .pipe(csv())
           .on('data', (data) => {
             records.push(data);
           })
           .on('end', () => {
             console.log("Load csv: ", retry_dict.country, records.length);
             return records;
           });
}

async function main() {

    retry_dict = {
        "lang": "en",
        "country": "HK"      // US, IN, HK
    }
    await read_csv(retry_dict);
    let promise = new Promise((resolve, reject) => {
        setTimeout(() => resolve("done!"), 3000)
        });
    await promise;
    console.log("Retry records: ",  records.length);

    const titles = retry_keys.join(',') + '\n';
    fs.writeFileSync(retry_dict.country+"/.retry_2.csv", titles, console.log);
    await scrape_similar_retry(retry_dict, records);
}


main();

