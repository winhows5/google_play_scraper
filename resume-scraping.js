// resume-scraping.js
import { getAppIds, getScrapedAppIds, getCategoryAppCounts } from './db.js';
import { ScraperOrchestrator } from './orchestrator.js';

class ResumeScraper {
    constructor() {
        this.stats = {
            totalApps: 0,
            completedApps: 0,
            remainingApps: 0,
            appsPerCategory: {}
        };
    }

    async analyzeProgress() {
        console.log('🔍 Analyzing current scraping progress...\n');
        
        // Get intelligent analysis instead of basic counts
        const { getAppIds, getAppsNeedingReviews, getCategoryAppCounts } = await import('./db.js');
        const analysis = await getAppsNeedingReviews();
        const categoryCounts = await getCategoryAppCounts();
        
        this.stats.totalApps = analysis.stats.total;
        this.stats.completedApps = analysis.stats.completed;
        this.stats.remainingApps = analysis.stats.needsWork;
        
        console.log('📊 INTELLIGENT PROGRESS ANALYSIS');
        console.log('='.repeat(50));
        console.log(`Total Apps: ${this.stats.totalApps.toLocaleString()}`);
        console.log(`Apps Completed (5000+ reviews): ${this.stats.completedApps.toLocaleString()}`);
        console.log(`Apps Needing Work: ${this.stats.remainingApps.toLocaleString()}`);
        console.log(`Overall Completion: ${analysis.stats.completionPercentage}%`);
        console.log('');
        
        // Break down by priority
        const highPriority = analysis.needsReviews.filter(a => a.priority === 'high').length;
        const mediumPriority = analysis.needsReviews.filter(a => a.priority === 'medium').length;
        const lowPriority = analysis.needsReviews.filter(a => a.priority === 'low').length;
        
        console.log('📈 PRIORITY BREAKDOWN:');
        console.log(`High Priority (0-100 reviews): ${highPriority.toLocaleString()}`);
        console.log(`Medium Priority (100-1000 reviews): ${mediumPriority.toLocaleString()}`);
        console.log(`Low Priority (1000-5000 reviews): ${lowPriority.toLocaleString()}`);
        console.log('='.repeat(50));
        
        // Show breakdown by category
        const categoryBreakdown = await this.getCategoryBreakdown();
        
        if (categoryBreakdown.incompleteCategories.length > 0) {
            console.log('\n📂 CATEGORIES WITH REMAINING APPS:');
            console.log('-'.repeat(50));
            console.log('Category'.padEnd(25) + 'Total'.padEnd(8) + 'Done'.padEnd(8) + 'Remaining'.padEnd(12) + 'Progress');
            console.log('-'.repeat(50));
            
            for (const cat of categoryBreakdown.incompleteCategories) {
                const progress = `${cat.progress}%`;
                console.log(
                    `${cat.category.padEnd(25)}${cat.total.toString().padEnd(8)}${cat.completed.toString().padEnd(8)}${cat.remaining.toString().padEnd(12)}${progress}`
                );
            }
        }
        
        return {
            needsResume: this.stats.remainingApps > 0,
            remainingApps: this.stats.remainingApps,
            incompleteCategories: categoryBreakdown.incompleteCategories,
            highPriorityApps: highPriority,
            intelligentAnalysis: analysis
        };
    }

    async getCategoryBreakdown() {
        // Get all app ranks to see which apps belong to which categories
        const { fetchAllRecords } = await import('./db.js');
        const allRanks = await fetchAllRecords('app_ranks', 'app_id, category');
        const scrapedAppIds = await getScrapedAppIds();
        const scrapedSet = new Set(scrapedAppIds);
        
        // Group apps by category
        const categoryApps = {};
        for (const rank of allRanks) {
            if (!categoryApps[rank.category]) {
                categoryApps[rank.category] = {
                    total: 0,
                    completed: 0,
                    apps: []
                };
            }
            categoryApps[rank.category].total++;
            categoryApps[rank.category].apps.push(rank.app_id);
            
            if (scrapedSet.has(rank.app_id)) {
                categoryApps[rank.category].completed++;
            }
        }
        
        // Calculate remaining and progress for each category
        const incompleteCategories = [];
        for (const [category, data] of Object.entries(categoryApps)) {
            const remaining = data.total - data.completed;
            const progress = ((data.completed / data.total) * 100).toFixed(1);
            
            if (remaining > 0) {
                incompleteCategories.push({
                    category,
                    total: data.total,
                    completed: data.completed,
                    remaining,
                    progress: parseFloat(progress)
                });
            }
        }
        
        // Sort by most remaining first
        incompleteCategories.sort((a, b) => b.remaining - a.remaining);
        
        return { incompleteCategories };
    }

    async estimateTimeRemaining() {
        const avgReviewsPerApp = 5000;
        const avgTimePerReview = 0.1; // seconds based on your logs
        const concurrentScrapers = parseInt(process.env.MAX_CONCURRENT || 20);
        
        const totalReviewsRemaining = this.stats.remainingApps * avgReviewsPerApp;
        const timePerAppSeconds = avgReviewsPerApp * avgTimePerReview;
        const timeWithConcurrency = timePerAppSeconds / concurrentScrapers;
        
        const totalTimeSeconds = this.stats.remainingApps * timeWithConcurrency;
        const hours = Math.floor(totalTimeSeconds / 3600);
        const minutes = Math.floor((totalTimeSeconds % 3600) / 60);
        
        console.log(`\n⏰ TIME ESTIMATION:`);
        console.log(`Remaining reviews to scrape: ${totalReviewsRemaining.toLocaleString()}`);
        console.log(`Estimated time with ${concurrentScrapers} scrapers: ${hours}h ${minutes}m`);
        
        return { hours, minutes, totalTimeSeconds };
    }

    async resume() {
        console.log('\n🚀 RESUMING SCRAPING...');
        console.log('Using improved orchestrator with app-level completion tracking\n');
        
        // Clear orchestrator state to restart fresh
        const fs = await import('fs/promises');
        try {
            await fs.unlink('logs/orchestrator-state.json');
            console.log('✅ Cleared orchestrator state for fresh restart');
        } catch (error) {
            console.log('📝 No previous orchestrator state found');
        }
        
        // Start the improved orchestrator
        const orchestrator = new ScraperOrchestrator();
        await orchestrator.run();
    }

    async showInstructions() {
        console.log('\n📋 NEXT STEPS:');
        console.log('='.repeat(50));
        console.log('1. Run the resume command:');
        console.log('   node resume-scraping.js --resume');
        console.log('');
        console.log('2. Or resume just the reviews phase of the pipeline:');
        console.log('   node master-pipeline.js --reviews-only');
        console.log('');
        console.log('3. Monitor progress in another terminal:');
        console.log('   npm run monitor');
        console.log('');
        console.log('4. The improved orchestrator will:');
        console.log('   ✅ Check app-level completion (not just categories)');
        console.log('   ✅ Restart failed categories automatically');
        console.log('   ✅ Continue until 95% of apps have reviews');
        console.log('   ✅ Show real-time progress of remaining apps');
    }
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const command = process.argv[2];
    const resumer = new ResumeScraper();
    
    if (command === '--resume') {
        resumer.resume().catch(console.error);
    } else {
        // Default: analyze and show instructions
        resumer.analyzeProgress()
            .then(async (analysis) => {
                if (analysis.needsResume) {
                    await resumer.estimateTimeRemaining();
                    await resumer.showInstructions();
                } else {
                    console.log('\n🎉 All apps appear to be completed!');
                    console.log('✅ No resume needed');
                }
            })
            .catch(console.error);
    }
}

export { ResumeScraper };