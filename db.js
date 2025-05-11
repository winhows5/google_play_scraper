// db.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
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

async function getAppIds() {
    // First get all app_ids
    const { data, error } = await supabase
        .from('app_ranks')
        .select('app_id');
    
    if (error) throw error;

    // Then use Set to get unique values
    const uniqueAppIds = [...new Set(data.map(item => item.app_id))];
    return uniqueAppIds;
}

async function getCategoryAppCounts() {
    // Fixed function that uses the correct Supabase query syntax
    try {
        // First get all app_ranks data
        const { data, error } = await supabase
            .from('app_ranks')
            .select('category');
        
        if (error) throw error;
        
        // Process the data to manually count apps per category
        const counts = {};
        data.forEach(item => {
            const category = item.category;
            counts[category] = (counts[category] || 0) + 1;
        });
        
        return counts;
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
    getAppIds,
    getCategoryAppCounts
};