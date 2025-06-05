export const category_list = [
    "APPLICATION",
    "ANDROID_WEAR",
    "ART_AND_DESIGN",
    "AUTO_AND_VEHICLES",
    "BEAUTY",
    "BOOKS_AND_REFERENCE",
    "BUSINESS",
    "COMICS",
    "COMMUNICATION",
    "DATING",
    "EDUCATION",
    "ENTERTAINMENT",
    "EVENTS",
    "FINANCE",
    "FAMILY",
    "FOOD_AND_DRINK",
    "HEALTH_AND_FITNESS",
    "HOUSE_AND_HOME",
    "LIBRARIES_AND_DEMO",
    "LIFESTYLE",
    "MAPS_AND_NAVIGATION",
    "MEDICAL",
    "MUSIC_AND_AUDIO",
    "NEWS_AND_MAGAZINES",
    "PARENTING",
    "PERSONALIZATION",
    "PHOTOGRAPHY",
    "PRODUCTIVITY",
    "SHOPPING",
    "SOCIAL",
    "SPORTS",
    "TOOLS",
    "TRAVEL_AND_LOCAL",
    "VIDEO_PLAYERS",
    "WATCH_FACE",
    "WEATHER",
    "GAME",
    "GAME_ACTION",
    "GAME_ADVENTURE",
    "GAME_ARCADE",
    "GAME_BOARD",
    "GAME_CARD",
    "GAME_CASINO",
    "GAME_CASUAL",
    "GAME_EDUCATIONAL",
    "GAME_MUSIC",
    "GAME_PUZZLE",
    "GAME_RACING",
    "GAME_ROLE_PLAYING",
    "GAME_SIMULATION",
    "GAME_SPORTS",
    "GAME_STRATEGY",
    "GAME_TRIVIA",
    "GAME_WORD",
]

export const country_list = [
    "US",
    "IN",
    "HK",
]

var rank_template = {
    "app_id": "",
    "app_name": "",
    "app_page_url": "",
    "rank_at_souce": 0,
    "rank_method": "Top Free",
    "category": "",
    "scrape_date": "2022-11-12"
}

var retry_template = {
    "cat_num": 0,
    "app_num": 0,
    "app_id": "",
    "request_date": "2022-11-12",
    "count": 0,
    "info": "",
    "last_date": "2013-11-10T18:31:42.174Z",
    "first_date": "2013-11-10T18:31:42.174Z",
    "app_page_url": "",
}

var review_template = {
    "app_id": "",
    "app_name": "",
    "country": "US",
    "language": "us",
    "post_date": "2013-11-10T18:31:42.174Z",
    "review_id": "",
    "author_name": "",
    "rating": 0,
    "review_title": "",
    "review_content": "A JSON object",
    "app_version": "",
    "helpful_voting": 0,
    "url": ""
}

var review_stat_template = {
    "app_id": "",
    "app_name": "",
    "category": "",
    "category_rank": 1.0,
    "review_amounts": 0,
    "last_review_date": "2013-11-10T18:31:42.174Z",
    "first_review_date": "2013-11-10T18:31:42.174Z",
    "scrape_date": "2013-11-10",
}

var info_template = {
    "app_id": "",
    "app_name": "",
    "country": "US",
    "company_name": "..",
    "app_description": "string",
    "is_free": true,
    "price": 0,
    "currency": "USD",
    "category": "",
    "download_numbers": "",
    "total_ratings": 0,
    "total_reviews": 0,
    "app_score": 0,
    "ratings_distribution": " {\"1\":0, \"2\":0, \"3\":0, \"4\":0, \"5\":0}",
    "release_date": "May 30, 2013",
    "update_date": "May 30, 2013",
    "scrape_date": "2013-11-10"
}

export const rank_keys = Object.keys(rank_template);
export const retry_keys = Object.keys(retry_template);
export const review_keys = Object.keys(review_template);
export const review_stat_keys = Object.keys(review_stat_template);
export const info_keys = Object.keys(info_template);

export const DELIMITER = String.fromCharCode(0x1F);