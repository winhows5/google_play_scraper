// monitor-progress.js
import { supabase } from './db.js';

class ProgressMonitor {
    constructor() {
        this.refreshInterval = 30000; // 30 seconds
        this.isRunning = false;
    }

    async getCategoryProgress() {
        try {
            // Try to use the database function first
            const { data, error } = await supabase.rpc('get_category_progress');
            
            if (error) {
                console.log('Using fallback method for category progress...');
                return await this.getCategoryProgressFallback();
            }
            
            return data;
        } catch (error) {
            console.error('Error getting category progress:', error);
            return [];
        }
    }

    async getCategoryProgressFallback() {
        // Fallback implementation
        const { data: ranks, error: ranksError } = await supabase
            .from('app_ranks')
            .select('app_id, category');
        
        if (ranksError) throw ranksError;
        
        const { data: reviews, error: reviewsError } = await supabase
            .from('app_reviews')
            .select('app_id');
        
        if (reviewsError) throw reviewsError;
        
        // Process data manually
        const categoryStats = {};
        const reviewCounts = {};
        
        // Count reviews per app
        reviews.forEach(review => {
            reviewCounts[review.app_id] = (reviewCounts[review.app_id] || 0) + 1;
        });
        
        // Process by category
        ranks.forEach(rank => {
            if (!categoryStats[rank.category]) {
                categoryStats[rank.category] = {
                    category: rank.category,
                    total_apps: 0,
                    apps_with_reviews: 0,
                    apps_completed: 0
                };
            }
            
            categoryStats[rank.category].total_apps++;
            
            const reviewCount = reviewCounts[rank.app_id] || 0;
            if (reviewCount > 0) {
                categoryStats[rank.category].apps_with_reviews++;
            }
            if (reviewCount >= 5000) {
                categoryStats[rank.category].apps_completed++;
            }
        });
        
        // Calculate percentages
        return Object.values(categoryStats).map(stat => ({
            ...stat,
            completion_percentage: ((stat.apps_completed / stat.total_apps) * 100).toFixed(2)
        }));
    }

    async getOverallStats() {
        try {
            const { data: totalApps, error: appsError } = await supabase
                .from('app_ranks')
                .select('app_id', { count: 'exact', head: true });
            
            const { data: totalReviews, error: reviewsError } = await supabase
                .from('app_reviews')
                .select('*', { count: 'exact', head: true });
            
            const { data: uniqueAppsWithReviews, error: uniqueError } = await supabase
                .rpc('get_distinct_app_ids');
            
            if (appsError || reviewsError) {
                console.error('Database errors:', { appsError, reviewsError });
                return null;
            }
            
            // Handle potential null values and provide defaults
            const totalAppsCount = totalApps || 0;
            const totalReviewsCount = totalReviews || 0;
            const uniqueCount = (uniqueError || !uniqueAppsWithReviews) ? 0 : uniqueAppsWithReviews.length;
            
            // Ensure we don't divide by zero
            const completionPercentage = totalAppsCount > 0 
                ? ((uniqueCount / totalAppsCount) * 100).toFixed(2)
                : '0.00';
            
            return {
                total_apps: totalAppsCount,
                total_reviews: totalReviewsCount,
                apps_with_reviews: uniqueCount,
                completion_percentage: completionPercentage
            };
        } catch (error) {
            console.error('Error getting overall stats:', error);
            return null;
        }
    }

    async getProblematicApps() {
        try {
            // Apps with more than 5000 reviews
            const excessive = await supabase
                .rpc('get_apps_with_sufficient_reviews', { min_reviews: 5001 });
            
            // Apps with very few reviews (possible stuck scrapers)
            const { data: minimal, error: minError } = await supabase
                .from('app_reviews')
                .select('app_id')
                .group('app_id')
                .having('count(*)', 'lt', 100);
            
            return {
                excessive_reviews: excessive.error ? [] : excessive.data,
                minimal_reviews: minError ? [] : minimal
            };
        } catch (error) {
            console.error('Error getting problematic apps:', error);
            return { excessive_reviews: [], minimal_reviews: [] };
        }
    }

    async displayProgress() {
        console.clear();
        console.log('📊 GOOGLE PLAY SCRAPER PROGRESS MONITOR');
        console.log('=' .repeat(80));
        console.log(`Last updated: ${new Date().toLocaleString()}`);
        console.log('=' .repeat(80));
        
        // Overall stats
        const overallStats = await this.getOverallStats();
        if (overallStats) {
            console.log('\n🌍 OVERALL PROGRESS:');
            console.log(`Total Apps: ${overallStats.total_apps.toLocaleString()}`);
            console.log(`Apps with Reviews: ${overallStats.apps_with_reviews.toLocaleString()}`);
            console.log(`Total Reviews: ${overallStats.total_reviews.toLocaleString()}`);
            console.log(`Completion: ${overallStats.completion_percentage}%`);
        }
        
        // Category breakdown
        const categoryProgress = await this.getCategoryProgress();
        if (categoryProgress.length > 0) {
            console.log('\n📂 CATEGORY PROGRESS:');
            console.log('Category'.padEnd(25) + 'Apps'.padEnd(8) + 'With Reviews'.padEnd(15) + 'Completed'.padEnd(12) + 'Progress');
            console.log('-'.repeat(80));
            
            categoryProgress
                .sort((a, b) => parseFloat(b.completion_percentage) - parseFloat(a.completion_percentage))
                .forEach(cat => {
                    const name = cat.category.padEnd(25);
                    const total = cat.total_apps.toString().padEnd(8);
                    const withReviews = cat.apps_with_reviews.toString().padEnd(15);
                    const completed = cat.apps_completed.toString().padEnd(12);
                    const progress = `${cat.completion_percentage}%`;
                    
                    console.log(`${name}${total}${withReviews}${completed}${progress}`);
                });
        }
        
        // Problematic apps
        const problematic = await this.getProblematicApps();
        if (problematic.excessive_reviews.length > 0) {
            console.log(`\n⚠️  APPS WITH EXCESSIVE REVIEWS (${problematic.excessive_reviews.length}):`);
            problematic.excessive_reviews.slice(0, 10).forEach(app => {
                console.log(`  ${app.app_id}: ${app.review_count.toLocaleString()} reviews`);
            });
            if (problematic.excessive_reviews.length > 10) {
                console.log(`  ... and ${problematic.excessive_reviews.length - 10} more`);
            }
        }
        
        if (problematic.minimal_reviews.length > 0) {
            console.log(`\n🐌 APPS WITH MINIMAL REVIEWS (${problematic.minimal_reviews.length}):`);
            problematic.minimal_reviews.slice(0, 5).forEach(app => {
                console.log(`  ${app.app_id}`);
            });
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('Press Ctrl+C to exit');
    }

    async start() {
        console.log('Starting progress monitor...');
        this.isRunning = true;
        
        // Initial display
        await this.displayProgress();
        
        // Set up refresh interval
        const interval = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            try {
                await this.displayProgress();
            } catch (error) {
                console.error('Error updating display:', error);
            }
        }, this.refreshInterval);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\n👋 Stopping monitor...');
            this.isRunning = false;
            clearInterval(interval);
            process.exit(0);
        });
    }
}

// Export for use in other modules
export { ProgressMonitor };

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const monitor = new ProgressMonitor();
    monitor.start().catch(console.error);
}