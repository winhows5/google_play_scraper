// orchestrator.js
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getCategoryAppCounts } from './db.js';

// Configuration
const MAX_CONCURRENT_SCRAPERS = parseInt(process.env.MAX_CONCURRENT || 20); // Increased from 10 to 20
const STAGGER_DELAY = 15000; // Reduced from 30s to 15s between launching scrapers
const RESOURCE_CHECK_INTERVAL = 60000; // Check resources every minute

// All categories
const ALL_CATEGORIES = [
    'ART_AND_DESIGN',
    'AUTO_AND_VEHICLES',
    'BEAUTY',
    'BOOKS_AND_REFERENCE',
    'BUSINESS',
    'COMICS',
    'COMMUNICATION',
    'DATING',
    'EDUCATION',
    'ENTERTAINMENT',
    'EVENTS',
    'FINANCE',
    'FOOD_AND_DRINK',
    'HEALTH_AND_FITNESS',
    'HOUSE_AND_HOME',
    'LIBRARIES_AND_DEMO',
    'LIFESTYLE',
    'MAPS_AND_NAVIGATION',
    'MEDICAL',
    'MUSIC_AND_AUDIO',
    'NEWS_AND_MAGAZINES',
    'PARENTING',
    'PERSONALIZATION',
    'PHOTOGRAPHY',
    'PRODUCTIVITY',
    'SHOPPING',
    'SOCIAL',
    'SPORTS',
    'TOOLS',
    'TRAVEL_AND_LOCAL',
    'VIDEO_PLAYERS',
    'WEATHER'
];

class ScraperOrchestrator {
    constructor() {
        this.runningScrapers = new Map();
        this.completedCategories = new Set();
        this.failedCategories = new Set();
        this.stats = {
            startTime: Date.now(),
            categoriesStarted: 0,
            categoriesCompleted: 0,
            categoriesFailed: 0,
            restarts: 0
        };
    }

    async initialize() {
        // Create logs directory
        await fs.mkdir('logs', { recursive: true });
        
        // Load state if exists (for resuming)
        try {
            const stateFile = 'logs/orchestrator-state.json';
            const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
            this.completedCategories = new Set(state.completed);
            this.failedCategories = new Set(state.failed);
            console.log(`Resuming: ${this.completedCategories.size} completed, ${this.failedCategories.size} failed`);
        } catch (error) {
            console.log('Starting fresh orchestration');
        }
        
        // Get category app counts for prioritization
        const categoryCounts = await getCategoryAppCounts();
        
        // Sort categories by app count (process smaller categories first)
        this.sortedCategories = ALL_CATEGORIES
            .filter(cat => !this.completedCategories.has(cat))
            .sort((a, b) => (categoryCounts[a] || 0) - (categoryCounts[b] || 0));
        
        console.log(`Categories to process: ${this.sortedCategories.length}`);
        console.log(`Max concurrent scrapers: ${MAX_CONCURRENT_SCRAPERS}`);
    }

    async saveState() {
        const state = {
            completed: Array.from(this.completedCategories),
            failed: Array.from(this.failedCategories),
            stats: this.stats,
            timestamp: new Date().toISOString()
        };
        
        await fs.writeFile('logs/orchestrator-state.json', JSON.stringify(state, null, 2));
    }

    async checkResources() {
        const freeMemory = os.freemem();
        const totalMemory = os.totalmem();
        const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
        const loadAverage = os.loadavg()[0]; // 1-minute load average
        const cpuCount = os.cpus().length;
        
        const resources = {
            memoryUsagePercent: memoryUsagePercent.toFixed(2),
            freeMemoryMB: Math.round(freeMemory / 1048576),
            loadAverage: loadAverage.toFixed(2),
            loadPerCpu: (loadAverage / cpuCount).toFixed(2),
            runningScrapers: this.runningScrapers.size,
            healthy: true
        };
        
        // Check if resources are getting constrained
        if (memoryUsagePercent > 85 || loadAverage > cpuCount * 2) {
            resources.healthy = false;
            console.warn('⚠️  Resource constraints detected!');
        }
        
        return resources;
    }

    async launchScraper(category) {
        return new Promise((resolve, reject) => {
            console.log(`🚀 Launching scraper for ${category}`);
            
            const scraperProcess = spawn('node', ['scrape-category.js', category], {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1024' } // Limit memory per process
            });
            
            this.runningScrapers.set(category, {
                process: scraperProcess,
                startTime: Date.now(),
                pid: scraperProcess.pid
            });
            
            this.stats.categoriesStarted++;
            
            // Handle stdout
            scraperProcess.stdout.on('data', (data) => {
                // Optional: Parse and display progress
                const message = data.toString().trim();
                if (message.includes('Progress:') || message.includes('completed')) {
                    console.log(`📊 ${message}`);
                }
            });
            
            // Handle stderr
            scraperProcess.stderr.on('data', (data) => {
                console.error(`❌ [${category}] Error: ${data.toString().trim()}`);
            });
            
            // Handle completion
            scraperProcess.on('exit', (code) => {
                this.runningScrapers.delete(category);
                
                if (code === 0) {
                    console.log(`✅ ${category} completed successfully`);
                    this.completedCategories.add(category);
                    this.stats.categoriesCompleted++;
                    resolve();
                } else {
                    console.error(`❌ ${category} failed with code ${code}`);
                    this.failedCategories.add(category);
                    this.stats.categoriesFailed++;
                    reject(new Error(`${category} failed`));
                }
                
                this.saveState().catch(console.error);
            });
        });
    }

    async runBatch() {
        const activeCategoryCount = this.runningScrapers.size;
        const availableSlots = MAX_CONCURRENT_SCRAPERS - activeCategoryCount;
        
        if (availableSlots <= 0) {
            return; // Already at max capacity
        }
        
        // Check resources before launching new scrapers
        const resources = await this.checkResources();
        if (!resources.healthy) {
            console.log('⏸️  Pausing new launches due to resource constraints');
            return;
        }
        
        // Launch new scrapers
        const categoriesToLaunch = this.sortedCategories
            .filter(cat => !this.runningScrapers.has(cat) && !this.completedCategories.has(cat))
            .slice(0, availableSlots);
        
        for (const category of categoriesToLaunch) {
            await this.launchScraper(category).catch(err => {
                console.error(`Failed to launch ${category}:`, err.message);
            });
            
            // Stagger launches to avoid overwhelming the API
            if (categoriesToLaunch.indexOf(category) < categoriesToLaunch.length - 1) {
                console.log(`⏳ Waiting ${STAGGER_DELAY/1000}s before next launch...`);
                await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY));
            }
        }
    }

    async displayStatus() {
        const elapsed = Date.now() - this.stats.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 ORCHESTRATOR STATUS');
        console.log('='.repeat(60));
        console.log(`Runtime: ${hours}h ${minutes}m`);
        console.log(`Categories: ${this.stats.categoriesCompleted}/${ALL_CATEGORIES.length} completed`);
        console.log(`Running: ${this.runningScrapers.size} scrapers`);
        console.log(`Failed: ${this.stats.categoriesFailed} categories`);
        
        // Show running scrapers
        if (this.runningScrapers.size > 0) {
            console.log('\nRunning scrapers:');
            for (const [category, info] of this.runningScrapers) {
                const runtime = Math.floor((Date.now() - info.startTime) / 60000);
                console.log(`  - ${category} (PID: ${info.pid}, ${runtime}m)`);
            }
        }
        
        // Show resource usage
        const resources = await this.checkResources();
        console.log('\nResources:');
        console.log(`  Memory: ${resources.memoryUsagePercent}% used (${resources.freeMemoryMB}MB free)`);
        console.log(`  Load: ${resources.loadAverage} (${resources.loadPerCpu} per CPU)`);
        console.log('='.repeat(60) + '\n');
    }

    async run() {
        await this.initialize();
        
        console.log('🎯 Starting scraper orchestration...\n');
        
        // Main orchestration loop
        const orchestrationInterval = setInterval(async () => {
            try {
                await this.runBatch();
                
                // NEW: Check completion based on actual app progress, not just categories
                const allAppIds = await this.checkActualCompletion();
                if (allAppIds.allComplete) {
                    clearInterval(orchestrationInterval);
                    clearInterval(statusInterval);
                    await this.displayStatus();
                    console.log('✅ All apps processed!');
                    console.log(`📊 Final stats: ${allAppIds.completedApps}/${allAppIds.totalApps} apps have sufficient reviews`);
                    
                    if (this.failedCategories.size > 0) {
                        console.log('\n❌ Failed categories:', Array.from(this.failedCategories).join(', '));
                    }
                    
                    process.exit(this.failedCategories.size > 0 ? 1 : 0);
                }
                
                // Fallback: Original category-based check (but with higher threshold)
                const categoriesProcessed = this.completedCategories.size + this.failedCategories.size;
                if (categoriesProcessed >= ALL_CATEGORIES.length) {
                    // All categories attempted, but check if we still have apps to process
                    if (!allAppIds.allComplete) {
                        console.log(`⚠️  All categories processed but ${allAppIds.totalApps - allAppIds.completedApps} apps still need reviews`);
                        console.log('🔄 Restarting failed categories to capture remaining apps...');
                        
                        // Reset failed categories to retry
                        this.failedCategories.clear();
                        this.stats.restarts++;
                        
                        // Don't exit, let it continue
                        if (this.stats.restarts > 3) {
                            console.log('❌ Maximum restarts reached, stopping');
                            clearInterval(orchestrationInterval);
                            clearInterval(statusInterval);
                            process.exit(1);
                        }
                    } else {
                        clearInterval(orchestrationInterval);
                        clearInterval(statusInterval);
                        await this.displayStatus();
                        console.log('✅ All categories and apps processed!');
                        process.exit(this.failedCategories.size > 0 ? 1 : 0);
                    }
                }
            } catch (error) {
                console.error('Orchestration error:', error);
            }
        }, 30000); // Check every 30 seconds
        
        // Status display interval
        const statusInterval = setInterval(() => {
            this.displayStatus().catch(console.error);
        }, RESOURCE_CHECK_INTERVAL);
        
        // Initial batch
        await this.runBatch();
        await this.displayStatus();
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down orchestrator...');
            
            // Kill all running scrapers
            for (const [category, info] of this.runningScrapers) {
                console.log(`Stopping ${category}...`);
                info.process.kill();
            }
            
            await this.saveState();
            process.exit(0);
        });
    }
    
    // NEW: Check actual app-level completion with intelligent detection
    async checkActualCompletion() {
        try {
            const { getAppIds, getAppsNeedingReviews } = await import('./db.js');
            
            const analysis = await getAppsNeedingReviews();
            
            const completedApps = analysis.stats.completed;
            const totalApps = analysis.stats.total;
            const remainingApps = analysis.stats.needsWork;
            
            // Simple completion criteria: Have we attempted all 1,600 apps?
            // An app is "attempted" if it has ANY reviews (even just 10 or 50)
            const allComplete = remainingApps === 0; // All apps have been attempted
            
            // Log progress every few checks
            if (this.lastProgressLog && Date.now() - this.lastProgressLog < 300000) {
                // Don't log too frequently
            } else {
                console.log(`📊 App Scraping Progress:`);
                console.log(`  Total apps: ${totalApps}`);
                console.log(`  Apps attempted (have any reviews): ${completedApps}`);
                console.log(`  Apps not yet attempted: ${remainingApps}`);
                console.log(`  Progress: ${(completedApps/totalApps*100).toFixed(1)}% of apps attempted`);
                console.log(`  Status: ${allComplete ? 'ALL APPS ATTEMPTED' : 'STILL SCRAPING'}`);
                this.lastProgressLog = Date.now();
            }
            
            return {
                allComplete,
                completedApps,
                totalApps,
                remainingApps,
                completionPercentage: (completedApps / totalApps * 100).toFixed(1),
                highPriorityRemaining: remainingApps, // All remaining are high priority (not attempted)
                mediumPriorityRemaining: 0,
                isBasicallyComplete: allComplete,
                isFullyComplete: allComplete
            };
        } catch (error) {
            console.error('Error checking completion:', error);
            // Fallback to old logic if this fails
            return {
                allComplete: false,
                completedApps: 0,
                totalApps: 1600,
                remainingApps: 1600,
                completionPercentage: 0,
                highPriorityRemaining: 1600,
                mediumPriorityRemaining: 0,
                isBasicallyComplete: false,
                isFullyComplete: false
            };
        }
    }
}

// Resource recommendations
function getResourceRecommendations() {
    const cpuCount = os.cpus().length;
    const totalMemoryGB = Math.round(os.totalmem() / 1073741824);
    
    console.log('\n📋 RESOURCE RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    console.log('\n🖥️  AWS EC2 Instance:');
    if (cpuCount < 4 || totalMemoryGB < 8) {
        console.log('  Current: Low resources detected');
        console.log('  Recommended: t3.xlarge or better');
        console.log('  - 4 vCPUs, 16 GB RAM');
        console.log('  - For 10 concurrent scrapers');
    } else if (cpuCount < 8 || totalMemoryGB < 16) {
        console.log('  Current: Medium resources');
        console.log('  Optimal: t3.2xlarge or m5.2xlarge');
        console.log('  - 8 vCPUs, 32 GB RAM');
        console.log('  - For 15-20 concurrent scrapers');
    } else {
        console.log('  Current: Good resources');
        console.log('  You can run 20+ concurrent scrapers');
    }
    
    console.log('\n🗄️  Supabase:');
    console.log('  Plan: Pro or higher recommended');
    console.log('  - 60 concurrent connections minimum');
    console.log('  - Consider connection pooling');
    console.log('  - Enable database performance insights');
    
    console.log('\n⚡ Performance Tips:');
    console.log('  1. Run on same region as Supabase');
    console.log('  2. Use SSD storage for logs');
    console.log('  3. Monitor with: htop, iotop');
    console.log('  4. Set up CloudWatch alarms');
    console.log('='.repeat(50) + '\n');
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const command = process.argv[2];
    
    if (command === 'recommend') {
        getResourceRecommendations();
    } else {
        const orchestrator = new ScraperOrchestrator();
        orchestrator.run().catch(console.error);
    }
}

export { ScraperOrchestrator, getResourceRecommendations };