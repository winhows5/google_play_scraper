import dotenv from 'dotenv';
import { scrapeRankings } from './rank.js';
import { scrapeAppMetadata } from './meta.js';
import { scrapeReviews } from './reviews.js';
import { getCategoryAppCounts } from './db.js';

dotenv.config();

async function validateBeforeContinuing() {
    console.log('Validating app counts before proceeding...');
    
    const categoryCounts = await getCategoryAppCounts();
    let allValid = true;
    let totalApps = 0;
    
    // Check counts for each category
    const categories = Object.keys(categoryCounts);
    for (const category of categories) {
        const count = categoryCounts[category];
        totalApps += count;
        if (count < 50) {
            console.warn(`Warning: Category ${category} only has ${count} apps (needs 50)`);
            allValid = false;
        }
    }
    
    // Log validation results
    console.log(`Total apps in database: ${totalApps}`);
    if (categories.length < 37) {
        console.warn(`Warning: Only ${categories.length} categories found (expected 37)`);
        allValid = false;
    }
    
    return allValid;
}

async function main() {
    try {
        console.log('Starting scraping process...');
        
        console.log('Scraping rankings...');
        await scrapeRankings();
        
        // Validate data before proceeding
        const isValid = await validateBeforeContinuing();
        if (!isValid) {
            console.warn('Warning: App data validation failed. You may want to re-run ranking scraper or fix issues before continuing.');
            const forceConfirm = process.env.FORCE_CONTINUE === 'true';
            if (!forceConfirm) {
                console.log('Set FORCE_CONTINUE=true in your .env file to proceed anyway.');
                console.log('Exiting...');
                process.exit(0);
            }
            console.log('Proceeding despite validation failures (FORCE_CONTINUE=true)');
        }
        
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