#!/bin/bash
# launch-scrapers.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Google Play Scraper Launcher${NC}"
echo "================================"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Function to show menu
show_menu() {
    echo
    echo "Select launch option:"
    echo "1) Orchestrated scraping (Recommended)"
    echo "2) Single category test"
    echo "3) Resource recommendations"
    echo "4) Monitor progress"
    echo "5) Clean logs"
    echo "6) Setup PM2 (for production)"
    echo "7) Exit"
    echo
}

# Function to run orchestrator
run_orchestrator() {
    echo -e "${YELLOW}Starting orchestrator with intelligent rate limiting...${NC}"
    export MAX_CONCURRENT=${MAX_CONCURRENT:-10}
    echo "Max concurrent scrapers: $MAX_CONCURRENT"
    echo
    node orchestrator.js
}

# Function to test single category
test_category() {
    echo "Available categories:"
    echo "ART_AND_DESIGN, AUTO_AND_VEHICLES, BEAUTY, BOOKS_AND_REFERENCE,"
    echo "BUSINESS, COMICS, COMMUNICATION, DATING, EDUCATION, ENTERTAINMENT,"
    echo "EVENTS, FINANCE, FOOD_AND_DRINK, HEALTH_AND_FITNESS, HOUSE_AND_HOME,"
    echo "LIFESTYLE, SHOPPING, SOCIAL, SPORTS, TOOLS, etc."
    echo
    read -p "Enter category name: " category
    
    if [ -z "$category" ]; then
        echo -e "${RED}❌ Category name required${NC}"
        return
    fi
    
    echo -e "${YELLOW}Starting scraper for $category...${NC}"
    node scrape-category.js "$category"
}

# Function to monitor
monitor_progress() {
    echo -e "${YELLOW}Monitoring scraping progress...${NC}"
    
    # Use watch if available
    if command -v watch &> /dev/null; then
        watch -n 5 'tail -n 20 logs/scrape-*.log 2>/dev/null | grep -E "Progress:|completed|Error"'
    else
        # Simple loop
        while true; do
            clear
            echo "=== Latest Progress ==="
            tail -n 20 logs/scrape-*.log 2>/dev/null | grep -E "Progress:|completed|Error"
            echo
            echo "Press Ctrl+C to exit"
            sleep 5
        done
    fi
}

# Function to clean logs
clean_logs() {
    read -p "Are you sure you want to clean all logs? (y/N): " confirm
    if [[ $confirm == [yY] ]]; then
        rm -rf logs/*
        echo -e "${GREEN}✅ Logs cleaned${NC}"
    else
        echo "Cancelled"
    fi
}

# Function to setup PM2
setup_pm2() {
    echo -e "${YELLOW}Setting up PM2 for production...${NC}"
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo "PM2 not found. Installing..."
        npm install -g pm2
    fi
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'scraper-orchestrator',
    script: './orchestrator.js',
    instances: 1,
    env: {
      MAX_CONCURRENT: 10,
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    time: true,
    kill_timeout: 300000, // 5 minutes to gracefully shutdown
    listen_timeout: 10000,
    max_restarts: 5,
    restart_delay: 60000 // 1 minute between restarts
  }]
}
EOF
    
    echo -e "${GREEN}✅ PM2 ecosystem file created${NC}"
    echo
    echo "To start with PM2:"
    echo "  pm2 start ecosystem.config.js"
    echo "  pm2 logs"
    echo "  pm2 monit"
    echo "  pm2 save"
    echo "  pm2 startup"
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1)
            run_orchestrator
            ;;
        2)
            test_category
            ;;
        3)
            node orchestrator.js recommend
            ;;
        4)
            monitor_progress
            ;;
        5)
            clean_logs
            ;;
        6)
            setup_pm2
            ;;
        7)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
done