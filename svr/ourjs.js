/*!@preserve
* OurJS     : Free Blog Engine, Forum System, Website Template and CMS Platform based on Node.JS
* Copyright : Kris Zhang <kris.newghost@gmail.com>
* Homepage  : http://code.ourjs.com
* Project   : https://github.com/newghost/ourjs
* License   : BSD
*/

//import namespace
var fs          = require('fs')
  , http        = require('http')
  , path        = require('path')
  , qs          = require('querystring')
  , WebSvr      = require('websvr')
  , RedisStore  = require('websvr-redis')
  , redis       = require('redis')
  , redblade    = require('redblade')
  , client
  , config      = global.CONFIG = require(path.join('../', process.argv[2]))


/*
* js library used for both front-end and back-end
*/
require('../lib/string.js')()


var WEBSVR_CONFIG   = config.WEBSVR_CONFIG
  , MESSAGES        = config.MESSAGES
  , REDIS_CONFIG    = config.REDIS_CONFIG



//Start the WebSvr
var app = WebSvr(WEBSVR_CONFIG)

//Set default model
app.model({ user:{} })

//change template engine
//app.engine(require("./doT").compile)


//将app暴露给全局模块使用
global.app = global.webSvr = app




//加载各种模块
var User    = require('./user')       // 用户登录、注册
  , Article = require('./article')    // 文章列表，内容显示
  , Root    = require('./root')       // 文章编辑、保存管理



var init = function() {
  client = redis.createClient(REDIS_CONFIG)
  client.select(REDIS_CONFIG.select)

  redblade.init({ schema: './schema', client: client }, function(err) {
    /*
    WEBSVR      : Session过期单位是毫秒(Millisecond)
    RedisStore  : key的过期时间是秒(Second)
    */
    var redisstore = RedisStore(client, WEBSVR_CONFIG.sessionTimeout / 1000)
    app.sessionStore = redisstore

    //安装插件
    config.PLUGINS.forEach(function(plugin) {
      //addons
      require(plugin)
    })
  })
}



/*
对所有请求均自动解析并附加session方法
*/
app.use(function(req, res) {
  var url       = req.url
    , user      = req.session.get('user') || {}
    , cookies   = req.cookies

  var handleNext = function(userInfo) {
    //if root dir redirect to home, etc /, /?abc=1234
    if (url == '/' || url[1] == '?') {
      Article.showListHandler(req, res, "/home/")
    } else {
      req.filter.next()
    }
  }

  //未登录且有自动登录的cookie
  if (!user.username && cookies.t0) {
    User.getAutoSignin(cookies, function(userInfo) {
      req.session.set('user', userInfo || {})
      handleNext()
    })
  } else {
    handleNext()
  }

}, { session: true })





/*
* Init 执行初始化
*/
init()