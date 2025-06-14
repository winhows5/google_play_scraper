// db.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
        auth: {
            persistSession: false, // Disable for server-side usage
        }
    }
);

async function insertAppRank(data) {
    const { error } = await supabase
        .from('app_ranks')
        .insert(data);
    
    if (error) throw error;
}

async function insertAppMeta(data) {
    const { error } = await supabase
        .from('app_meta')
        .insert(data);
    
    if (error) throw error;
}

async function insertAppReview(data) {
    const { error } = await supabase
        .from('app_reviews')
        .insert(data);
    
    if (error) throw error;
}

async function insertAppReviewBatch(reviews) {
    const chunkSize = 100;
    const maxRetries = 3;
    
    console.log(`Starting batch insert of ${reviews.length} reviews`);
    
    for (let i = 0; i < reviews.length; i += chunkSize) {
        const chunk = reviews.slice(i, i + chunkSize);
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                const { error } = await supabase
                    .from('app_reviews')
                    .insert(chunk);
                
                if (error) {
                    if (error.code === '23505') {
                        // Duplicate key - skip
                        console.log(`Skipping ${chunk.length} duplicate reviews`);
                        break;
                    }
                    throw error;
                }
                break;
                
            } catch (err) {
                retries++;
                if (retries >= maxRetries) {
                    console.error(`Failed to insert chunk after ${maxRetries} retries:`, err.message);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
        }
    }
    
    console.log(`Batch insert completed`);
}

async function fetchAllRecords(table, columns) {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        allData = [...allData, ...data];
        page++;
        hasMore = data.length === pageSize;
    }
    
    console.log(`Retrieved ${allData.length} total records from ${table}`);
    return allData;
}

async function getAppIds() {
    try {
        const data = await fetchAllRecords('app_ranks', 'app_id');
        const uniqueAppIds = [...new Set(data.map(item => item.app_id))];
        console.log(`Found ${uniqueAppIds.length} unique app IDs`);
        return uniqueAppIds;
    } catch (error) {
        console.error('Error in getAppIds:', error);
        throw error;
    }
}

async function getCategoryAppCounts() {
    try {
        const data = await fetchAllRecords('app_ranks', 'app_id, category');
        
        const categoryApps = {};
        data.forEach(item => {
            if (!categoryApps[item.category]) {
                categoryApps[item.category] = new Set();
            }
            categoryApps[item.category].add(item.app_id);
        });
        
        const result = {};
        for (const category in categoryApps) {
            result[category] = categoryApps[category].size;
        }
        
        return result;
    } catch (error) {
        console.error('Error getting category counts:', error);
        throw error;
    }
}

export {
    supabase,
    insertAppRank,
    insertAppMeta,
    insertAppReview,
    insertAppReviewBatch,
    getAppIds,
    getCategoryAppCounts,
    fetchAllRecords
};