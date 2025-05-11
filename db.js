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
    const { data, error } = await supabase
        .from('app_ranks')
        .select('category, count(*)')
        .group('category');
    
    if (error) throw error;
    
    const counts = {};
    data.forEach(item => {
        counts[item.category] = parseInt(item.count);
    });
    
    return counts;
}

export {
    supabase,
    insertAppRank,
    insertAppMeta,
    insertAppReview,
    getAppIds,
    getCategoryAppCounts
};