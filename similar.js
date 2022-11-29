const gplay = require('google-play-scraper');
const fs = require('fs');
const csv = require('csv-parser');
const {category_list, dict_keys, retry_keys} = require('./const');


/* MUST be used after rank.js
*/
async function scrape_similar (partition_dict, rank_records) {
    var total = 0;
    var app_count = 0;
    for (let i = 0; i < rank_records.length; i++) {
        let app_id = rank_records[i].app_id;
        let app_page_url = rank_records[i].app_page_url;
        await gplay.similar({appId: app_id, fullDetail: true, country: partition_dict.country, throttle: 30})
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
                dict_keys.map(key =>{
                    return item[key];
                }).join(',')
                ));
                
            const app_similar = app_similar_csv.join('\n') + '\n';
            fs.appendFile(partition_dict.country+"/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", app_similar, console.log);
            console.log("snowball %d of Source: %d %s\n", v2.length, i, app_id);
        })
        .catch((e) => {
            console.error("Error from %s: %s", app_id, app_page_url); 
            console.error(e);
            var retry_list = [];
            retry_list.push({
                "cat_num": partition_dict.num,
                "app_id": app_id,
                "request_date": (new Date()).toISOString().slice(0, 10),
                "app_page_url": app_page_url,
            });
            const retry_csv = retry_list.map(item => (
                retry_keys.map(key => {
                    return item[key];
                }).join(',')
                ));
            const retry_string = retry_csv.join('\n') + '\n';
            fs.appendFile(".retry.csv", retry_string, console.log);
            app_count += 1;
            console.log(total, " process: ", app_count);
        })
    }
}



var download_record;   // used for partial re-downloading
var rank_records;
async function read_csv (partition_dict) {
    rank_records = [];
    return fs.createReadStream(partition_dict.country+"/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv")
           .pipe(csv())
           .on('data', (data) => {
             rank_records.push(data);
           })
           .on('end', () => {
             console.log("Load csv: ", partition_dict.category, rank_records.length);
             return rank_records;
           });
}

async function main() {
    var record_data = fs.readFileSync('.download_record.json');
    download_record = JSON.parse(record_data);

    for (let i = 0; i < 32; i++) {
        
        partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": "en",
            "country": "US"      // US, IN, HK
        }

        await read_csv(partition_dict);
        let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done!"), 3000)
          });
        await promise;
        console.log("Category: ", i, rank_records.length);
        await scrape_similar(partition_dict, rank_records);
    }
}

main();