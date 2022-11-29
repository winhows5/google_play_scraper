const gplay = require('google-play-scraper');
const fs = require('fs');
const csv = require('csv-parser');
const {category_list, dict_keys} = require('../const');



async function read_csv (partition_dict) {
    let records = [];
    fs.createReadStream(partition_dict.country+"_orig/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv")
        .pipe(csv())
        .on('data', (data) => {

            let total_index = -1;
            for (const key in data) {
                total_index++;
            }

            while (total_index > 8)
            {
                data.app_name = data.app_name +","+ data.app_page_url;
                data.app_page_url = data.source;
                data.source = data.source_app;
                data.source_app = data.rank_at_souce;
                data.rank_at_souce = data.rank_method;
                data.rank_method = data.category;
                data.category = data.request_date;
                data.request_date = data["_9"];
                for (let i=9; i<total_index; i++) {
                    data["_"+i] = data["_"+(i+1)];
                }
                delete data["_"+total_index];
                total_index--;
            }
            data.app_name = "\"" + data.app_name + "\"";
            console.log(data.app_page_url);
            records.push(data);
            
        })
        .on('end', () => {
            console.log("Load csv: ", partition_dict.country, partition_dict.category, records.length);
            const app_similar_csv = records.map(item => (
                dict_keys.map(key =>{
                    return item[key];
                }).join(',')
                ));
                
            const app_similar = app_similar_csv.join('\n') + '\n';
            fs.appendFile(partition_dict.country+"/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", app_similar, console.log);
        });
}

async function main() {

    let country = "IN";
    for (let i = 0; i < 32; i++) {
        
        partition_dict = {
            "num": i,
            "category": category_list[i],
            "lang": "en",
            "country": country      // US, IN, HK
        }
        const titles = dict_keys.join(',') + '\n';
        fs.writeFileSync(partition_dict.country+"/"+partition_dict.category+"_"+partition_dict.country+"_"+partition_dict.lang+".csv", titles, console.log);
        await read_csv(partition_dict);
        console.log("Country: %s, Category: %s", country, i);
    }
}

main();