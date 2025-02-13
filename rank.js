import gplay from 'google-play-scraper';
import { insertAppRank } from './db.js';

// List of all Google Play categories
const categories = [
    'GAME', 'FAMILY', 'COMMUNICATION', 'PRODUCTIVITY', 'SOCIAL',
    'PHOTOGRAPHY', 'ENTERTAINMENT', 'TOOLS', 'BUSINESS', 'LIFESTYLE',
    'EDUCATION', 'FINANCE', 'HEALTH_AND_FITNESS', 'SHOPPING', 'TRAVEL_AND_LOCAL'
];

export async function scrapeRankings() {
    for (const category of categories) {
        try {
            console.log(`Scraping category: ${category}`);
            
            const apps = await gplay.list({
                category: category,
                collection: gplay.collection.TOP_FREE,
                num: 1,
                country: 'US',
                fullDetail: true
            });

            const scrapeDate = new Date().toISOString().split('T')[0];

            for (let i = 0; i < apps.length; i++) {
                const app = apps[i];
                const rankData = {
                    app_id: app.appId,
                    app_name: app.title,
                    category: category,
                    app_url: app.url,
                    rank: i + 1,
                    scrape_date: scrapeDate
                };

                await insertAppRank(rankData);
                console.log(`Inserted rank data for ${app.title}`);
            }

            // Add delay between categories
            await new Promise(resolve => setTimeout(resolve, process.env.SCRAPE_DELAY || 1000));
        } catch (error) {
            console.error(`Error scraping category ${category}:`, error);
        }
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    scrapeRankings().catch(console.error);
}