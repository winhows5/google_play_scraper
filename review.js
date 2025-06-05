/*
Get the reviews from a app list. This list is obtained by rank.js.
*/


import gplay from 'google-play-scraper';
import fs from 'fs';
import csv from 'csv-parser';
import { category_list, review_keys, review_stat_keys, retry_keys, DELIMITER } from './const.js';


var REVIEW_LIMIT = 50000;

// change here for distributed servers
var REVIEW_COUNTRY = "US";
var REVIEW_LANG = "en_US";
var PART_START = 0;      // partition for category range
var PART_END = 1;

var rank_records;


function get_date() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = yyyy + mm + dd;
    return today;
}


/* rank list is obtained according to rank.js
*/  
async function scrape_review(partition_dict, rank_records, dir) {

    // Additional codes for easy retry
    let tmp = 0;

    for (let i = tmp; i < rank_records.length; i++) {
        var page_count = 0;
        var review_count = 0;
        console.log("Current app: ", rank_records[i]["app_id"]);

        let app_id = rank_records[i]["app_id"];
        let app_name = rank_records[i]["app_name"];
        let nextPag = null;
        let hasAll = false;
        while (!hasAll) {
            console.log("current page: ", nextPag);
            await gplay.reviews({
                appId: app_id,
                // lang: partition_dict.lang,
                country: partition_dict.country,
                sort: gplay.sort.HELPFULNESS,
                paginate: true,
                nextPaginationToken: nextPag,
                throttle: 1
            })
                .then(v => {
                    let v2 = v.data;
                    if (v2.length === 0 && page_count !== 0) {
                        throw new Error("Length Exception");
                    }
                    var result = [];
                    nextPag = v.nextPaginationToken;
                    for (let j = 0; j < v2.length; j++) {

                        if (REVIEW_LIMIT <= review_count) {   // or, run till this number
                            nextPag = null;
                            break;
                        }
                        let dict = {
                            "app_id": app_id,
                            "app_name": app_name,
                            "country": partition_dict.country,
                            "language": partition_dict.lang,
                            "post_date": v2[j].date,
                            "review_id": v2[j].id,
                            "author_name": v2[j].userName,
                            "rating": v2[j].score,
                            "review_title": v2[j].title,
                            "review_content": v2[j].text,
                            "app_version": v2[j].version,
                            "helpful_voting": v2[j].thumbsUp,
                            "url": v2[j].url
                        }
                        result.push(dict);
                        review_count += 1;
                    }

                    page_count += 1;
                    console.log("next page: ", v.nextPaginationToken);
                    console.log("current len: ", result.length, "total reviews: ", review_count, " page: ", page_count);

                    if (result.length > 0) {
                        const app_review_csv = result.map(item => (
                            review_keys.map(key => {
                                return item[key];
                            }).join(DELIMITER)
                        ));

                        const app_review = app_review_csv.join('\n') + '\n';
                        fs.appendFileSync(dir + partition_dict.category + "_review.csv", app_review, console.log);
                    }
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
                        "last_date": "",
                        "first_date": "",
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

        let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done!"), 3000)
        });
        await promise;
        console.log("FINISH ONE. number: ", i);
    }
}

async function read_csv(partition_dict) {
    rank_records = [];
    let dir = partition_dict.country + "_rank_" + get_date() + "/";
    fs.createReadStream(dir + partition_dict.category + "_rank.csv")
        .pipe(csv({
            separator: '\u001F'
        }))
        .on('data', (data) => {
            rank_records.push(data);
        })
        .on('end', () => {
            console.log("Load csv: ", partition_dict.category, rank_records.length);
        });
}

async function main() {
    for (let i = PART_START; i < PART_END; i++) {
        let partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": REVIEW_LANG,
            "country": REVIEW_COUNTRY      // US, IN, HK
        }
        let dir = partition_dict.country + "_review_" + get_date() + "/";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        read_csv(partition_dict);

        let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done!"), 3000)
        });
        await promise;

        // wirte titles
        if (!fs.existsSync(dir + partition_dict.category + "_review.csv")) {
            const titles = review_keys.join(DELIMITER) + '\n';
            fs.writeFileSync(dir + partition_dict.category + "_review.csv", titles, console.log);
        }

        if (!fs.existsSync(dir + ".retry.csv")) {
            const retry_titles = retry_keys.join(DELIMITER) + '\n';
            fs.writeFileSync(dir + ".retry.csv", retry_titles, console.log);
        }

        // keep only frst 50 apps
        // rank_records = rank_records.slice(0, 50);
        console.log("Category: ", i, " number: ", rank_records.length);
        await scrape_review(partition_dict, rank_records, dir);
    }
}

main();