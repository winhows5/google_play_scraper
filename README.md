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

Some apps are inaccessible due to reasons, which may cause incoherence between different lists. 

Take care when dealing with such apps in US:

| App Name                                   | App ID                                            | Date of awareness |
| -----------                                | -----------                                       | -----------       |
| Anime tv - Anime Tv Online HD              | com.animetv.animetvonline.us2002                  | 2023-01-02        |
| Anime tv - Anime Watching App              | com.animetv.sub.dub                               | 2023-01-02        |
| Live yassine tv apk ياسين تيفي             | apk.yacinetv.yacinetvapk                          | 2023-01-02        |
| Blood Pressure Tracker                     | com.bloodpressurechecker.bpmonitor.bptracker      | 2023-01-02        |
| IPTV Smarters Pro                          | com.nst.iptvsmarterstvbox                         | 2023-01-02        |


Take care when dealing with such apps in IN:

| App Name                                   | App ID                                            | Date of awareness |
| -----------                                | -----------                                       | -----------       |
| rto vehicle information app                | rto.vehical.information.carinfo.rtoexam.address   | 2023-03-02        |
| Sketchme: Cartoon Photo Editor             | com.jbnfa.photo.sketme.toonme                     | 2023-03-02        |
| Beauty Camera - Selfie Camera              | ai.beautyplus.edit                                | 2023-03-02        |
| XFace: Virtual Makeup Artist               | com.xface.beautymakeup.selfiecamera               | 2023-03-02        |
| Marathi Calendar 2023 - मराठी               | com.mahalaxmi_marathi_calendar                    | 2023-03-02        |
| GoGoAnime Anime Online                     | gogoanime.botagora                                | 2023-03-02        |
| Anime tv - Anime Watching App              | com.animetv.sub.dub                               | 2023-03-02        |
| Robot Car Transform Robo Wars              | com.rsg.grand.ultimate.robot.car.transform.city.battle.shooting.fight.simulator.games                     | 2023-03-02        |
| Live Cricket TV HD Star Sports             | star.sportsupdates                                | 2023-03-02        |
| EasyTalk - Global Calling App              | com.easytalk.call                                 | 2023-03-02        |
| Messenger Lite                             | com.facebook.mlite                                | 2023-03-02        |
| Sexy Girl Live Video Call                  | com.xvvazlivevideo.vieoladalcallazaq              | 2023-03-02        |
| Ladki Se Baat Karane Vala App              | com.Video345.livecallcde                          | 2023-03-02        |
| Ladki Se Baat Karne Wala App               | com.VideocallLive17LvideO.Nop                     | 2023-03-02        |
| IN Sexy Girls Video Call                   | com.insexygirls.videocall                         | 2023-03-02        |
| Ladki se baat karne wala apps              | com.NewLookMatrix.VideoCall                       | 2023-03-02        |
| Cricket Live TV Streaming                  | com.starsports.totariapps.starsports.hd           | 2023-03-02        |
| Cricket Live TV Streaming                  | com.starsports.hassan.starsports.apps.star.sports | 2023-03-02        |
| Zili Short Video App for India             | com.funnypuri.client                              | 2023-03-02        |
| Get Daily FFF Diamonds Guide               | com.enter.howtogetdiamond.fff                     | 2023-03-02        |
| Zupee Ludo Gold - Tips                     | com.playings.tvfree.ludooo                        | 2023-03-02        |
| Cash PaPa Pro                              | com.personal.papa.pro.new                         | 2023-03-02        |
| Financial Cash                             | com.financial.book.com.cc                         | 2023-03-02        |
| Blood Pressure App                         | com.bloodpressure.bptrackerapp                    | 2023-03-02        |
| Blood Pressure Tracker                     | com.bloodpressurechecker.bpmonitor.bptracker      | 2023-03-02        |
| Phone Number Locator Caller id             | com.scorpio.callertrueid.truecaller.callerid      | 2023-03-02        |
| Pregnancy Test & Tracker                   | com.tpf.gavw.mcyzj                                | 2023-03-02        |
| All Video Downloader                       | hdnewvideoplayer.latestvideodownloader.vidvideoplayer  | 2023-03-02        |
| Launcher iOS 16                            | com.luutinhit.ioslauncher                         | 2023-03-02        |
| Ludo Gold : Play & Win Super               | com.z.ludo                                        | 2023-03-02        |
| Live Cricket TV: Cricket Score             | my.a                                              | 2023-03-02        |
| Cricket ALL STARS Sport                    | com.bdvapps.cricketall_stars                      | 2023-03-02        |
| speedbooster-live video proxy              | com.speedfiypro.app                               | 2023-03-02        |
| All Video Downloader                       | com.browsevideo.videoplayer.downloader            | 2023-03-02        |
| All Video Downloader                       | com.videowhatspehla.chatversiondownload           | 2023-03-02        |
| Public Bus simulator 2022                  | com.sa.real.bus.simulator                         | 2023-03-02        |


Take care when dealing with such apps in HK:

| App Name                                   | App ID                                            | Date of awareness |
| -----------                                | -----------                                       | -----------       |
| Beauty Camera - Selfie Camera              | ai.beautyplus.edit                                | 2023-03-02        |
| Sketchme: Cartoon Photo Editor             | com.jbnfa.photo.sketme.toonme                     | 2023-03-02        |
| 嗨小說                                      | com.kuaidu.readbook.reds                          | 2023-03-02        |
| Strange Spider Hero: Miami Rop             | fire.games.strange.spider.rope.hero               | 2023-03-02        |
| Hong Kong TV                               | hktv.reborn                                       | 2023-03-02        |
| Live yassine tv apk ياسين تيفي             | apk.yacinetv.yacinetvapk                          | 2023-03-02        |
| FizzBuzz                                   | com.startcech.wizbiz                              | 2023-03-02        |
| مباشر للمباريات المشفرة                    | feel3ard.abathmo                                  | 2023-03-02        |
| StayHomeSaf                                | com.compathnion.equarantine                       | 2023-03-02        |
| Blood Pressure App                         | com.bloodpressure.bptrackerapp                    | 2023-03-02        |
| Blood Pressure App: BP Monitor             | bloodpressureapp.bloodpressuremonitor.bloodpressuretracker     | 2023-03-02        |
| Rainbow - Friends Aid                      | com.moder_rainbow_friends.robux_assit_roblox_mod  | 2023-03-02        |
| Wallpaper Toca Life Town World             | com.fullhdtocabocawallpapers.mobgapps             | 2023-03-02        |
| One Cleaner - Easy & Fast                  | com.deep.super.mars.cleaner                       | 2023-03-02        |
| Pregnancy Test & Tracker                   | com.tpf.gavw.mcyzj                                | 2023-03-02        |
| CallMe: Tune Screen                        | com.callmetunescreen.app                          | 2023-03-02        |
| 经典老歌手机铃声300首 抖音铃声                 | com.bestringtone2017                              | 2023-03-02        |
| zenly - your world                         | app.zenly.locator                                 | 2023-03-02        |
| 世界杯直播-2022年卡塔尔世界杯赛程赛果           | com.sjbzb.sports.app                              | 2023-03-02        |
| 足球世界杯-2022卡塔尔世界杯直播,世界杯比分,赛事推荐   | com.football.live.footsjb.app                     | 2023-03-02        |
| Live football TV                           | com.widex.goalkolik                               | 2023-03-02        |
| Live Ten Sports                            | com.asadapps.live.ten.sports                      | 2023-03-02        |
| Live Football TV Streaming HD              | esport.livefootballscores.todayhdstreaming        | 2023-03-02        |
| Bubble Booster                             | com.bubble.booster                                | 2023-03-02        |
| Phone Cleaner                              | com.bingo.cooler.phonecleaner                     | 2023-03-02        |
| 电视直播极速TV 新闻节目直播 广播电台 IPTV网络电视         | com.douglassmaster.tv                             | 2023-03-02        |
| 蓝鲸影视-自由畅看电影、剧集                    | com.mqtech.vediogo                                | 2023-03-02        |
