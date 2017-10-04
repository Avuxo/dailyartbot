async function searchForTag(tag){
    var Danbooru = require('danbooru');
    var booru = new Danbooru.Safebooru();
    let postArray = await booru.posts({
        random: true,
        tags: tag
    }).then(function(){ console.log(postArray); });
    
}

module.exports = function(tag){
    searchForTag(tag);
}
