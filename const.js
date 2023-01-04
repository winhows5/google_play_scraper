module.exports.category_list = [
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
    "WEATHER"
]

module.exports.country_list = [
    "US",
    "IN",
    "HK",
]

var rank_template = {
    "app_id": "",
    "app_name": "",
    "app_page_url": "",
    "source": "stratified/snowball",
    "source_app": "stratified / [list of apps]",
    "rank_at_souce": 0,
    "rank_method": "Top Free",
    "category": "",
    "request_date": "2022-11-12"
}

var retry_template = {
    "cat_num": 0,
    "app_num": 0,
    "app_id": "",
    "request_date": "2022-11-12",
    "count": 0,
    "info": "",
    "app_page_url": "",
}

var review_template = {
    "app_id": "",
    "app_name": "",
    "country": "US",
    "language": "us",
    "post_date": "2013-11-10T18:31:42.174Z",
    "review_id": "",
    "user_name": "",
    "user_image": "",
    "score": 0,
    "review_title": "",
    "review_text": "A JSON object",
    "is_replied": 0,
    "reply_date": "2013-11-10T18:31:42.174Z",
    "reply_text": "A JSON object",
    "app_version": "",
    "thumbsup": 0,
    "url": "",
    "criterias": "[]",
}

var review_stat_template = {
    "app_id": "",
    "app_name": "",
    "category": "",
    "category_rank": 1.0,
    "review_amounts": 0,
    "last_review_date": "Wed Dec 28 2022 20:04:46 GMT-0500 (Eastern Standard Time)",
    "first_review_date": "Wed Dec 28 2022 20:04:46 GMT-0500 (Eastern Standard Time)",
    "scrape_date": "2013-11-10",
}

var info_template = {
    "app_id": "",
    "app_name": "",
    "country": "US",
    "language": "us",
    "app_description": "A JSON object",
    "release_date": "May 30, 2013",
    "is_free": 1,
    "price": 0,
    "currency": "USD",
    "app_score": 0,
    "download": "",
    "total_ratings": 0,
    "total_reviews": 0,
    "rating_hist": " {\"1\":0, \"2\":0, \"3\":0, \"4\":0, \"5\":0}",
    "app_category": "",
    "app_category_id": "",
    "scrape_date": "2013-11-10",
}

module.exports.dict_keys = Object.keys(rank_template);
module.exports.retry_keys = Object.keys(retry_template);
module.exports.review_keys = Object.keys(review_template);
module.exports.review_stat_keys = Object.keys(review_stat_template);
module.exports.info_keys = Object.keys(info_template);
