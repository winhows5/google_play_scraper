const gplay = require('google-play-scraper');
const fs = require('fs');
const {category_list, dict_keys} = require('./const');

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
            // console.log("record: ", dict.app_name, i+1);      
        }

        const result_csv = result.map(item => (
            dict_keys.map(key => {
                return item[key];
            }).join(',')
            ));
          
        const result_string = result_csv.join('\n') + '\n';
        fs.appendFileSync(partition_dict.country+"_rank_only/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", result_string, console.log);

        console.log("category: ", partition_dict.category);
        return v;
    }, console.log);
}


async function main() {
    for (let i = 0; i < 1; i++) {
        
        partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": "en",
            "country": "US"      // US, IN, HK
        }
        // wirte titles
        const titles = dict_keys.join(',') + '\n';
        fs.writeFileSync(partition_dict.country+"_rank_only/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", titles, console.log);

        console.log("Range: ", i);
        await scrape_rank(partition_dict);
    }
}

main();