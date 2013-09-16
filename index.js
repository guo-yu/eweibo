//                      _ __        
//   ___ _      _____  (_) /_  ____ 
//  / _ \ | /| / / _ \/ / __ \/ __ \
// /  __/ |/ |/ /  __/ / /_/ / /_/ /
// \___/|__/|__/\___/_/_.___/\____/ 
// 
// @brief: 企业版微博框架模拟工具与中间件
// @author: [turing](http://guoyu.me)
// 
// 中间件使用方法：
// app.use(eweibo.sign([key])); // 对所有路由都先解析userinfo与token，传递到 res.locals.eweibo
// app.get('/xxx', eweibo.admin) // 对应用的后台进行判断，当前这个用户是否是安装你应用的管理员用户
// 
// 此框架模拟工具模拟「专业版微博框架」三种情况
// 1. <未登录的访问者>：[根本没有tokenString，viewer也是空的未登录情况
// 2. <登录但未授权的用户>：有tokenString,但无法解析出正确token(没有oauth_token对象的情况)
// 3. <登录且授权过的用户>：有登录用户且授权了该子应用的sub_key的时候，返回正确的token对象

// token decoder
exports.decode = function(rawtoken) {
    var tokenbuffer = rawtoken.substr(rawtoken.indexOf('.') + 1);
    return JSON.parse(new Buffer(tokenbuffer, 'base64').toString('ascii'));
};

// Express 中间件
exports.sign = function(key, params) {
    return function(req, res, next) {
        var eweibo = {
            cid: req.query.cid,
            sub_appkey: req.query.sub_appkey
        };
        // 当用户已登录时才有res.locals.eweibo
        if (req.query.tokenString) {
            var token = exports.decode(req.query.tokenString);
            eweibo.auth = token.oauth_token ? true : false;
            eweibo.viewer = req.query.viewer;
            eweibo.token = token;
        }
        res.locals.eweibo = eweibo;
        // 授权弹窗
        res.locals.epopup = exports.popup(key, {
            sub_appkey: req.query.sub_appkey,
            cid: req.query.cid,
            height: params ? params.height : null,
            display: params ? params.display : null
        });
        next();
    }
};

// 判断登录授权的用户是否是该子应用的管理员账户（是不是本账户）
exports.admin = function(req, res, next) {
    if (res.locals.eweibo) {
        var token = res.locals.eweibo.token;
        if (token.oauth_token && token.user_id) {
            // 已授权的用户，判断下是不是安装这个应用的微博账户
            if (token.user_id == res.locals.eweibo.cid) {
                next();
            } else {
                res.send('access deny');
            }
        } else {
            res.redirect('/auth');
        }
    } else {
        next(new Error('not-authed'));
    }
};

// 输出授权所使用的js代码到res中
exports.popup = function(key, params) {
    var lib = '<script src="http://js.t.sinajs.cn/t4/enterprise/js/public/appframe/appClient.js" type="text/javascript"></script>';
    var configs = {
        client_id: params.sub_appkey,
        redirect_uri: 'http://e.weibo.com/' + params.cid + '/app_' + key,
        height: params.height ? parseInt(params.height, 10) : 120,
        display: params.display ? params.display : "apponweibo"
    }
    var custom = "<script type='text/javascript'> function authLoad() { App.AuthDialog.show(" + JSON.stringify(configs) + ");} </script>";
    return lib + custom;
};

// make fake req.query
exports.mock = function(req, res, next) {
    req.query.cid = 123;
    req.query.viewer = 999999;
    req.query.sub_appkey = 12345678;
    req.query.tokenString = '123121212.1212121212sqw';
    next();
}