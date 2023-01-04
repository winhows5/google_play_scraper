/*
Get the reviews from a app list. This list is obtained by rank.js.
*/


const gplay = require('google-play-scraper');
const fs = require('fs');
const csv = require('csv-parser');
const {category_list, review_keys, review_stat_keys, retry_keys} = require('./const');


var DELIMITER = String.fromCharCode(0x1F);
var REVIEW_DATE = new Date("2021-12-01T00:00:00.000Z");   // earliest date
var REVIEW_LIMIT = 3000000;
var rank_records;

/* rank list is obtained according to rank.js
*/
async function scrape_review(partition_dict, rank_records, dir) {
    for (let i = 0; i < rank_records.length; i++) { 
        var page_count = 0;
        var review_count = 0;
        csv_app_id = partition_dict.category + "_" + partition_dict.country + "_" + partition_dict.lang + "_appid";
        csv_app_name = partition_dict.category + "_" + partition_dict.country + "_" + partition_dict.lang + "_appname";
        console.log("Current app: ", rank_records[i][csv_app_id]);

        let date_latest = null;
        let date_earliest = new Date();

        let app_id = rank_records[i][csv_app_id];
        let app_name = rank_records[i][csv_app_name];
        let nextPag = null;
        let hasAll = false;
        while (!hasAll) {
            console.log("current page: ", nextPag);
            await gplay.reviews({appId: app_id, 
                lang: partition_dict.lang,
                country: partition_dict.country, 
                sort: gplay.sort.NEWEST,
                paginate: true,
                nextPaginationToken: nextPag,
                throttle: 1})
            .then( v => {
                nextPag = v.nextPaginationToken;
                v2 = v.data;
                var result = [];
                for (let j = 0; j < v2.length; j++) {

                    if (REVIEW_DATE > new Date(v2[j].date)) {   // run till this date
                        nextPag = null;
                        break;
                    }
                    if (REVIEW_LIMIT <= review_count) {   // or, run till this number
                        nextPag = null;
                        break;
                    }

                    let reviewDict = {
                        "text": v2[j].text,
                    }
                    let replayDict = {
                        "text": v2[j].replyText,
                    }
                    let dict = {
                        "app_id": app_id,
                        "app_name": app_name,
                        "country": partition_dict.country,
                        "language": partition_dict.lang,
                        "post_date": v2[j].date,
                        "review_id": v2[j].id,
                        "user_name": v2[j].userName,
                        "user_image": v2[j].userImage,
                        "score": v2[j].score,
                        "review_title": v2[j].title,
                        "review_text": JSON.stringify(reviewDict),
                        "is_replied": v2[j].replyDate === null ? 0 : 1,
                        "reply_date": v2[j].replyDate,
                        "reply_text": JSON.stringify(replayDict),
                        "app_version": v2[j].version,
                        "thumbsup": v2[j].thumbsUp,
                        "url": v2[j].url,
                        "criterias": JSON.stringify(v2[j].criterias),
                    }
                    result.push(dict);  
                    review_count += 1;

                    if (date_latest === null) {
                        date_latest = new Date(v2[j].date);
                    }
                    if (date_earliest > new Date(v2[j].date)) {   
                        date_earliest = new Date(v2[j].date);
                    }
                }
                  
                page_count += 1;
                console.log("next page: ", v.nextPaginationToken);
                console.log("current len: ", result.length, "total reviews: ", review_count, " page: ", page_count);
                const app_review_csv = result.map(item => (
                review_keys.map(key =>{
                    return item[key];
                }).join(DELIMITER)
                ));
                
                const app_review = app_review_csv.join('\n') + '\n';
                fs.appendFileSync(dir +partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", app_review, console.log);
                console.log("review %d of source: %d %s\n", v2.length, i, app_id);
                
                if (nextPag === null) {
                    hasAll = true;
                    console.log("Has ALL reviews! STOP.");
                }

            })
            .catch((e) => {
                console.error("Error from %s", app_id); 
                console.error(e);
                var retry_list = [];
                retry_list.push({
                    "cat_num": partition_dict.num,
                    "app_num": i,
                    "app_id": app_id,
                    "request_date": (new Date()).toISOString().slice(0, 10),
                    "count": review_count,
                    "info": nextPag,
                    "app_page_url": "",
                });
                const retry_csv = retry_list.map(item => (
                retry_keys.map(key => {
                    return item[key];
                }).join(DELIMITER)
                ));
                const retry_string = retry_csv.join('\n') + '\n';
                fs.appendFileSync(dir + ".retry.csv", retry_string, console.log);
                console.log("After error, total reviews: ", review_count, " page: ", page_count);
            })

            let promise = new Promise((resolve, reject) => {
                setTimeout(() => resolve("done"), 3000)
              });
            await promise;

        }
        
        csv_app_rank = partition_dict.category + "_" + partition_dict.country + "_" + partition_dict.lang + "avg_rank";
        let stat_dict = {
            "app_id": app_id,
            "app_name": app_name,
            "category": partition_dict.category,
            "category_rank": rank_records[i][csv_app_rank],
            "review_amounts": review_count,
            "last_review_date": date_latest,
            "first_review_date": date_latest === null ? null : date_earliest,
            "scrape_date": (new Date()).toISOString().slice(0, 10),
        }
        let stat_csv = review_stat_keys.map(key =>{
            return stat_dict[key];
        }).join(DELIMITER) + '\n';
        fs.appendFileSync(dir+"app_review_stat.csv", stat_csv, console.log);

        let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done!"), 3000)
          });
        await promise;
        console.log("FINISH ONE. number: ", i);
    }
}

async function read_csv (partition_dict) {
    rank_records = [];
    fs.createReadStream("APP_rank_list/Rank_track7days_WY/" + partition_dict.country+"_avg_rank_out_df.csv")
           .pipe(csv())
           .on('data', (data) => {
             rank_records.push(data);
           })
           .on('end', () => {
             console.log("Load csv: ", partition_dict.category, rank_records.length);
           });
}

async function main() {
    for (let i = 0; i < 32; i++) {
        partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": "en",
            "country": "US"      // US, IN, HK
        }
        dir = "App_review/" + partition_dict.country + "_review" + "/";
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        read_csv(partition_dict);
        
        let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done!"), 3000)
          });
        await promise;

        // wirte titles
        const titles = review_keys.join(DELIMITER) + '\n';
        fs.writeFileSync(dir+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", titles, console.log);
        if (!fs.existsSync(dir+"app_review_stat.csv")) {
            const stat_titles = review_stat_keys.join(DELIMITER) + '\n';
            fs.writeFileSync(dir+"app_review_stat.csv", stat_titles, console.log);
        }

        // keep only frst 20 apps
        rank_records = rank_records.slice(0, 20);
        console.log("Category: ", i, rank_records.length);
        await scrape_review(partition_dict, rank_records, dir);
    }
}

main();