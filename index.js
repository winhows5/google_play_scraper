import dotenv from 'dotenv';
import { scrapeRankings } from './rank.js';
import { scrapeAppMetadata } from './meta.js';
import { scrapeReviews } from './reviews.js';

dotenv.config();

async function main() {
    try {
        console.log('Starting scraping process...');
        
        console.log('Scraping rankings...');
        await scrapeRankings();
        
        console.log('Scraping app metadata...');
        await scrapeAppMetadata();
        
        console.log('Scraping reviews...');
        await scrapeReviews();
        
        console.log('Scraping process completed successfully!');
    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main();