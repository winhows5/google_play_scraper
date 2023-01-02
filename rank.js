const gplay = require('google-play-scraper');
const fs = require('fs');
const {category_list, dict_keys} = require('./const');

function get_date() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = yyyy + mm + dd;
    return today;
}
 

async function scrape_rank (partition_dict) {
    let result = [];
    const rank_list = gplay.list({
        category: partition_dict.category,
        collection: gplay.collection.TOP_FREE,
        num: 100,
        country: partition_dict.country,
        fullDetail: true,
        throttle: 50,
    });
    
    await rank_list.then(v => {
        for (let i = 0; i < v.length; i++) {
            let dict = {
                "app_id": v[i].appId,
                "app_name": "\"" + v[i].title + "\"",
                "app_page_url": v[i].url,
                "source": "stratified",
                "source_app": "stratified",
                "rank_at_souce": i+1,
                "rank_method": "Top Free",
                "category": v[i].genreId,
                "request_date": (new Date()).toISOString().slice(0, 10)
            }
            result.push(dict);          
        }
        const result_csv = result.map(item => (
            dict_keys.map(key => {
                return item[key];
            }).join(',')
            ));
          
        const result_string = result_csv.join('\n') + '\n';
        fs.appendFileSync(partition_dict.country+"_rank_" + get_date() + "/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", result_string, console.log);

        console.log("source num: %d\n", partition_dict.num);
        return v;
    }, console.log);
}

async function main() {

    for (let i = 0; i < 32; i++) {
        partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": "en",
            "country": "US"      // US, IN, HK
        }
        dir = partition_dict.country+"_rank_" + get_date() + "/";
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        // wirte titles
        const titles = dict_keys.join(',') + '\n';
        fs.writeFileSync(dir+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", titles, console.log);

        console.log("Range: ", i);
        await scrape_rank(partition_dict);
    }
}

main();