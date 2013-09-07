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
// app.use(eweibo.sign); // 对所有路由都先解析userinfo与token，传递到 res.locals.eweibo
// app.get('/xxx', eweibo.admin) // 对应用的后台进行判断，当前这个用户是否是安装你应用的管理员用户
// 
// 此框架模拟工具模拟「专业版微博框架」三种情况
// 1. <未登录的访问者>：[根本没有tokenString，viewer也是空的未登录情况
// 2. <登录但未授权的用户>：有tokenString,但无法解析出正确token(没有oauth_token对象的情况)
// 3. <登录且授权过的用户>：有登录用户且授权了该子应用的sub_key的时候，返回正确的token对象
// 
// 专业版用户开发指南见；http://open.weibo.com/wiki/%E4%B8%93%E4%B8%9A%E7%89%88%E5%BA%94%E7%94%A8%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97#.E4.BC.81.E4.B8.9A.E5.BA.94.E7.94.A8.E6.8E.88.E6.9D.83.E6.9C.BA.E5.88.B6

// token decoder
exports.decode = function(rawtoken) {
    var tokenbuffer = rawtoken.substr(rawtoken.indexOf('.') + 1);
    return JSON.parse(new Buffer(tokenbuffer, 'base64').toString('ascii'));
};

// wash token
exports.sign = function(req, res, next) {
    // 当用户已登录时才有
    if (req.query.tokenString) {
        res.locals.eweibo = {
            cid: req.query.cid,
            viewer: req.query.viewer,
            sub_appkey: req.query.sub_appkey,
            // 没有授权时解析不出access_token
            token: exports.decode(req.query.tokenString)
        }
    }
    next();
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