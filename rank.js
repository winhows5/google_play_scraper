/*
Get the top 50 rank list from 36 categories.
*/


import gplay from "google-play-scraper";
import fs from 'fs';
import { category_list, rank_keys, info_keys, DELIMITER } from './const.js';

function get_date() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = yyyy + mm + dd;
    return today;
}
 
function get_info(app_info, partition_dict) {
    let date = new Date(app_info.updated);
    let options = { year: 'numeric', month: 'short', day: 'numeric' };
    let updatedDate = date.toLocaleDateString('en-US', options);
    let detail = {
        "app_id": app_info.appId,
        "app_name": "\"" + app_info.title + "\"",
        "country": partition_dict.country,
        "company_name": app_info.developer,
        "app_description": app_info.description.replace(/\n/g, "\\n"),
        "is_free": app_info.free,
        "price": app_info.price,
        "currency": app_info.currency,
        "category": app_info.genreId,
        "download_numbers": app_info.maxInstalls,
        "total_ratings": app_info.ratings,
        "total_reviews": app_info.reviews,
        "app_score": app_info.score,
        "ratings_distribution": JSON.stringify(app_info.histogram),
        "release_date": app_info.released,
        "update_date": updatedDate,
        "scrape_date": (new Date()).toISOString().slice(0, 10),
    }  
    return detail
}

async function scrape_rank (partition_dict) {
    let rank_result = [];
    let info_result = [];
    let rank_list = gplay.list({
        category: partition_dict.category,
        collection: gplay.collection.TOP_FREE,
        num: 50,
        country: partition_dict.country,
        fullDetail: true,
        throttle: 50,
    });
    
    await rank_list.then(v => {
        console.log(`- Get ${v.length} app for current category.`);
        for (let i = 0; i < v.length; i++) {
            let dict_rank = {
                "app_id": v[i].appId,
                "app_name": "\"" + v[i].title + "\"",
                "app_page_url": v[i].url,
                "rank_at_souce": i+1,
                "rank_method": "Top Free",
                "category": v[i].genreId,
                "scrape_date": (new Date()).toISOString().slice(0, 10)
            }
            rank_result.push(dict_rank);
            info_result.push(get_info(v[i], partition_dict));
        }
        const rank_csv = rank_result.map(item => (
            rank_keys.map(key => {
                return item[key];
            }).join(DELIMITER)
            ));
        const info_csv = info_result.map(item => (
            info_keys.map(key => {
                return item[key];
            }).join(DELIMITER)
            ));
          
        let dir = partition_dict.country+"_rank_" + get_date() + "/"
        const rank_string = rank_csv.join('\n') + '\n';
        fs.appendFileSync(dir + partition_dict.category + "_rank.csv", rank_string,console.log);
        const info_string = info_csv.join('\n') + '\n';
        fs.appendFileSync(dir + partition_dict.category + "_app.csv", info_string,console.log);
        console.log("source num: %d\n", partition_dict.num);
        return v;
    }, console.log);
}

async function main() {

    for (let i = 0; i < 54; i++) {
        var partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": "en",
            "country": "US"      // US, IN, HK
        }
        let dir = partition_dict.country+"_rank_" + get_date() + "/";
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        // wirte titles
        const rank_titles = rank_keys.join(DELIMITER) + '\n';
        fs.writeFileSync(dir + partition_dict.category + "_rank.csv", rank_titles, console.log);
        const info_titles = info_keys.join(DELIMITER) + '\n';
        fs.writeFileSync(dir + partition_dict.category + "_app.csv", info_titles, console.log);

        console.log("Range: ", i, " Category: ", category_list[i]);
        await scrape_rank(partition_dict);
        await new Promise(r => setTimeout(() => r(), 3000));
    }
}

main();