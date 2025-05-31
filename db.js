// db.js - Optimized version with batch inserts
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

// Original single insert (keep for compatibility)
async function insertAppReview(data) {
    const { error } = await supabase
        .from('app_reviews')
        .insert(data);
    
    if (error) throw error;
}

// NEW: Batch insert for reviews
async function insertAppReviewBatch(reviews) {
    // Insert in chunks of 500 to avoid payload size limits
    const chunkSize = 500;
    
    for (let i = 0; i < reviews.length; i += chunkSize) {
        const chunk = reviews.slice(i, i + chunkSize);
        
        const { error } = await supabase
            .from('app_reviews')
            .insert(chunk);
        
        if (error) {
            console.error(`Batch insert error at chunk ${i/chunkSize}:`, error);
            throw error;
        }
    }
}

// Rest of your existing functions...
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
        console.log(`getAppIds found ${uniqueAppIds.length} unique app IDs from ${data.length} total records`);
        return uniqueAppIds;
    } catch (error) {
        console.error('Error in getAppIds:', error);
        throw error;
    }
}

async function getCategoryAppCounts() {
    try {
        console.log('Getting category app counts...');
        const data = await fetchAllRecords('app_ranks', 'app_id, category');
        
        console.log(`Raw query returned ${data.length} total records`);
        
        const allCategories = [...new Set(data.map(item => item.category))];
        console.log(`Found ${allCategories.length} unique categories in data:`, allCategories.join(', '));
        
        const categoryApps = {};
        data.forEach(item => {
            if (!item.category) {
                console.warn('Found item with no category:', item);
                return;
            }
            
            if (!categoryApps[item.category]) {
                categoryApps[item.category] = new Set();
            }
            categoryApps[item.category].add(item.app_id);
        });
        
        const result = {};
        for (const category in categoryApps) {
            result[category] = categoryApps[category].size;
            console.log(`Category ${category}: ${result[category]} unique apps`);
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
    insertAppReviewBatch, // NEW export
    getAppIds,
    getCategoryAppCounts,
    fetchAllRecords
};