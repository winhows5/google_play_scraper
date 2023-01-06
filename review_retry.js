/*
Retry the reviews failed for a app.
It will continue scrape the following apps of current category.
*/

const gplay = require('google-play-scraper');
const fs = require('fs');
const csv = require('csv-parser');
const {category_list, review_keys, review_stat_keys, retry_keys} = require('./const');


var DELIMITER = String.fromCharCode(0x1F);
var REVIEW_DATE = new Date("2021-12-01T00:00:00.000Z");
var REVIEW_LIMIT = 3000000;
var rank_records;

var retry_country = "US";  // Only change this one


/* rank list is obtained according to rank.js
*/
async function scrape_review_retry(partition_dict, rank_records, dir, retry_app, retry_count, retry_page, retry_last_date, retry_first_date) {

    var page_count = 0;
    for (let i = retry_app; i < rank_records.length; i++) { 
        var review_count = 0;
        csv_app_id = partition_dict.category + "_" + partition_dict.country + "_" + partition_dict.lang + "_appid";
        csv_app_name = partition_dict.category + "_" + partition_dict.country + "_" + partition_dict.lang + "_appname";
        console.log("Current app: ", rank_records[i][csv_app_id]);

        let date_latest = null;
        let date_earliest = (new Date()).toISOString();

        let app_id = rank_records[i][csv_app_id];
        let app_name = rank_records[i][csv_app_name];
        let nextPag = null;
        if (i === retry_app) {
            review_count = retry_count;
            date_latest = retry_last_date;
            date_earliest = retry_first_date;
            nextPag = retry_page;
        }
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
                v2 = v.data;
                if (v2.length === 0) {
                    throw new Error("Length Exception");
                }
                nextPag = v.nextPaginationToken;
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
                        date_latest = v2[j].date;
                    }
                    if (new Date(date_earliest) > new Date(v2[j].date)) {   
                        date_earliest = v2[j].date;
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
                    "last_date": date_latest,
                    "first_date": date_earliest,
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

        console.log("FINISH ONE. number: ", i);
    }
}

async function read_csv (partition_dict) {
    rank_records = [];
    fs.createReadStream("App_rank_list/Rank_track7days_WY/" + partition_dict.country+"_avg_rank_out_df.csv")
           .pipe(csv())
           .on('data', (data) => {
             rank_records.push(data);
           })
           .on('end', () => {
             console.log("Load csv: ", partition_dict.category, rank_records.length);
           });
}

async function main() {

    // read from retry.csv
    var retry_list = [];
    let dir = "App_review/" + retry_country + "_review" + "/";
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.createReadStream(dir + ".retry.csv")
    .pipe(csv({ separator: DELIMITER }))
    .on('data', (data) => {
        retry_list.push(data);
    })
    .on('end', () => {
        console.log("read retry data: ", retry_list);
        //fs.unlinkSync("App_review/" + retry_country + "_review/" + ".retry.csv");
    });
    
    let retry_csv_read = new Promise((resolve, reject) => {
        setTimeout(() => resolve("done!"), 3000)
    });
    await retry_csv_read;

    let k=retry_list.length-1;
    let retry_entry = retry_list[k];
    let retry_cat = parseInt(retry_entry.cat_num);
    let retry_app = parseInt(retry_entry.app_num);
    let retry_count = parseInt(retry_entry.count);
    let retry_page = retry_entry.info;
    let retry_last_date = retry_entry.last_date;
    let retry_first_date = retry_entry.first_date;

    partition_dict = {
        "num": retry_cat,
        "category": category_list[retry_cat],
        "lang": "en",
        "country": retry_country,
    }

    read_csv(partition_dict);
    
    let promise = new Promise((resolve, reject) => {
        setTimeout(() => resolve("done!"), 3000)
    });
    await promise;
    
    // keep only frst 20 apps
    rank_records = rank_records.slice(0, 20);
    console.log("Category: ", retry_cat, rank_records.length);
    await scrape_review_retry(partition_dict, rank_records, dir, retry_app, retry_count, retry_page, retry_last_date, retry_first_date);
}

main();