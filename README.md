# google_play_scraper
Personal scraper used to collect data for research.


### Functionality 

- **rank.js** is meant to get top100 apps from 32 categories.
- **similar.js** is meant to get similar apps from the rank_app list.
- **review.js** is meant to get 12-months (starts from 2021-12-01) reviews from the rank_app list (but only top20). 
- **info.js** is meant to get app information details from the rank_app list (but only top20). 

### Data Format

1. Rank

``` JS
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
  ```

2. Review

``` JS
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
```

3. Review Stat

``` JS
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
```

4. App Info

``` JS
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
```

### Stipulation

1. text field

The text fields such as "review_text", "reply_text", and "description" are generated as a JSON object:
```
{
  "text": "Any string",
}
```
As the text fields could contain a bunch of illegal characters.
  
2. delimiter / separator

All CSV files under App_rank use comma as the delimiter.
All other CSV files use ASCII 0x1F (Unit Separator) as the delimiter.
   
  
### Incoherence

Some apps are inaccessible due to reasons, which may cause incoherence between different lists. Take care when dealing with such apps:

| App Name                                   | App ID                                            | Date of awareness |
| -----------                                | -----------                                       | -----------       |
| Anime tv - Anime Tv Online HD              | com.animetv.animetvonline.us2002                  | 2023-01-02        |
| Anime tv - Anime Watching App              | com.animetv.sub.dub                               | 2023-01-02        |
| Live yassine tv apk ياسين تيفي             | apk.yacinetv.yacinetvapk                          | 2023-01-02        |
| Blood Pressure Tracker                     | com.bloodpressurechecker.bpmonitor.bptracker      | 2023-01-02        |
| IPTV Smarters Pro                          | com.nst.iptvsmarterstvbox                         | 2023-01-02        |



