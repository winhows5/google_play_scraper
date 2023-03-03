/*
Get the app information from a app list. This list is stored as review_stat.csv.
*/


const gplay = require('google-play-scraper');
const fs = require('fs');
const csv = require('csv-parser');
const {info_keys, retry_keys} = require('./const');


var DELIMITER = String.fromCharCode(0x1F);
var rank_records;

/* app list is obtained according to review.js
*/
async function scrape_app_info(partition_dict, rank_records, dir) {
    var app_count = 0;
    for (let i = 0; i < rank_records.length; i++) { 
        console.log("Current app: ", rank_records[i].app_id);
        let app_id = rank_records[i].app_id;
        await gplay.app({appId: app_id, 
            lang: partition_dict.lang,
            country: partition_dict.country, 
            throttle: 1})
            .then( v => {
                let descriptionDict = {
                    "text": v.description,
                }
                let dict = {
                    "app_id": app_id,
                    "app_name": v.title,
                    "country": partition_dict.country,
                    "language": partition_dict.lang,
                    "app_description": JSON.stringify(descriptionDict),
                    "release_date": v.released,
                    "is_free": v.free ? 1 : 0,
                    "price": v.price,
                    "currency": v.currency,
                    "app_score": v.score,
                    "download": v.maxInstalls,
                    "total_ratings": v.ratings,
                    "total_reviews": v.reviews,
                    "rating_hist": JSON.stringify(v.histogram),
                    "app_category": v.genre,
                    "app_category_id": v.genreId,
                    "scrape_date": (new Date()).toISOString().slice(0, 10),
                }
                    
                app_count += 1;
                console.log(" app count: ", app_count);
                const info_csv = info_keys.map(key =>{
                    return dict[key];
                }).join(DELIMITER) + '\n';
                
                fs.appendFileSync(dir + "app_info_" + partition_dict.country + "_" + partition_dict.lang + ".csv", info_csv, console.log);

            })
            .catch((e) => {
                console.error("Error from %s", app_id); 
                console.error(e);
                var retry_list = [];
                retry_list.push({
                "cat_num": partition_dict.num,
                "app_id": app_id,
                "request_date": (new Date()).toISOString().slice(0, 10),
                "app_page_url": "",
                });
                const retry_csv = retry_list.map(item => (
                retry_keys.map(key => {
                    return item[key];
                }).join(DELIMITER)
                ));
                const retry_string = retry_csv.join('\n') + '\n';
                fs.appendFileSync(dir + ".retry.csv", retry_string, console.log);
                console.log("After error, app count: ", app_count);
            })

        let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done"), 1000)
            });
        await promise;
    }
}

async function read_csv (partition_dict) {
    rank_records = [];
    fs.createReadStream("APP_review/" + partition_dict.country+"_review/" + "app_review_stat.csv")
           .pipe(csv({ separator: DELIMITER }))
           .on('data', (data) => {
             rank_records.push(data);
           })
           .on('end', () => {
             console.log("Load csv: ", partition_dict.category, rank_records.length);
           });
}
 
async function main() {

    partition_dict = {
        "num": null,
        "category": null,
        "lang": "en",
        "country": "HK"      // US, IN, HK
    }
    dir = "App_info/";
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    read_csv(partition_dict);
    
    let promise = new Promise((resolve, reject) => {
        setTimeout(() => resolve("done!"), 3000)
        });
    await promise;

    // wirte titles
    if (!fs.existsSync(dir + "app_info_" + partition_dict.country + "_" + partition_dict.lang + ".csv")) {
        const info_titles = info_keys.join(DELIMITER) + '\n';
        fs.writeFileSync(dir + "app_info_" + partition_dict.country + "_" + partition_dict.lang + ".csv", info_titles, console.log);
    }

    console.log("total records: ", rank_records.length);
    await scrape_app_info(partition_dict, rank_records, dir);
    
}

main();