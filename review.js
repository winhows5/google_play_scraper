const gplay = require('google-play-scraper');
const fs = require('fs');
const csv = require('csv-parser');
const {category_list, review_keys, retry_keys} = require('./const');


function get_date() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = yyyy + mm + dd;
    return today;
}

/* MUST be used after rank.js
*/
async function scrape_review(partition_dict, rank_records) {
    var review_count = 0;
    var page_count = 0;
    for (let i = 0; i < rank_reconds.length; i++) { 
        let app_id = rank_records[i].app_id;
        let app_name = rank_records[i].app_name;
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
                    let dict = {
                        "app_id": app_id,
                        "app_name": "\"" + app_name + "\"",
                        "country": partition_dict.country,
                        "language": partition_dict.lang,
                        "post_date": v2[j].date,
                        "review_id": v2[j].id,
                        "user_name": v2[j].userName,
                        "score": v2[j].score,
                        "review_title": v2[j].title,
                        "review_text": v2[j].text,
                        "is_replied": v2[j].replyDate === null ? 0 : 1,
                        "reply_date": v2[j].replyDate,
                        "reply_text": v2[j].replyText,
                        "app_version": v2[j].version,
                        "thumbsup": v2[j].thumbsUp,
                        "url": v2[j].url,
                    }
                    result.push(dict);  
                }
                  
                page_count += 1;
                review_count = review_count + result.length;
                console.log("next page: ", v.nextPaginationToken);
                console.log("current len: ", result.length, "total len: ", review_count, " page: ", page_count);
                const app_review_csv = result.map(item => (
                review_keys.map(key =>{
                    return item[key];
                }).join(',')
                ));
                
                const app_review = app_review_csv.join('\n') + '\n';
                fs.appendFile(partition_dict.country + "_review_" + get_date() + "/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", app_review, console.log);
                console.log("review %d of source: %d %s\n", v2.length, i, app_id);
                
                if (nextPag === null) {
                    hasAll = true;
                    console.log("Has ALL reviews! STOP.");
                }

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
                page_count += 1;
                console.log("After error, total len: ", review_count, " page: ", page_count);
            })

            let promise = new Promise((resolve, reject) => {
                setTimeout(() => resolve("done"), 3000)
              });
            await promise;

        }

        console.log("FINISH APP. count: ", i);
    }
}


var rank_records;
async function read_csv (partition_dict) {
    rank_records = [];
    return fs.createReadStream(partition_dict.country+"_rank/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv")
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
    for (let i = 0; i < 10; i++) {
        partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": "en",
            "country": "US"      // US, IN, HK
        }
        dir = partition_dict.country + "_review_" + get_date() + "/";
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        await read_csv(partition_dict);
        let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done!"), 3000)
          });
        await promise;

        // wirte titles
        const titles = review_keys.join(',') + '\n';
        fs.writeFileSync(dir+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", titles, console.log);
        
        console.log("Category: ", i, rank_records.length);
        await scrape_review(partition_dict, rank_records);
    }
}

main();