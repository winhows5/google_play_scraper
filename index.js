import dotenv from 'dotenv';
import { scrapeRankings } from './rank.js';
import { scrapeAppMetadata } from './meta.js';
import { scrapeReviews } from './reviews.js';

dotenv.config();

async function main() {
    try {
        console.log('Starting scraping process...');
        
        // Step 1: Scrape rankings
        console.log('Scraping rankings...');
        await scrapeRankings();
        
        // Step 2: Scrape app metadata
        console.log('Scraping app metadata...');
        await scrapeAppMetadata();
        
        // Step 3: Scrape reviews
        console.log('Scraping reviews...');
        await scrapeReviews();
        
        console.log('Scraping process completed successfully!');
    } catch (error) {
        console.error('Error in main process:', error);
    }
}

// Run the scraper
main().catch(console.error);