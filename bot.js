const readline = require('readline');
const discord = require('discord.js');
const bot = new discord.Client();
/*{
    "token" : "botTokenFromDiscord",
    "owner" : "ownerOfBotsUserID",
    "channel" : "nameOfChannel"
  }*/
const config = require('./config.json');
const Danbooru = require('danbooru');
const schedule = require('node-schedule');
var cooldown = require('./cooldown.js');

/*
  testing database
  exists in memory
*/
var db = [];

var booru = new Danbooru.Safebooru();

/*setup readline*/
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
/*read and evaluate input*/
rl.on('line', function(input){ eval(input); });

bot.on('ready', function(){
    console.log('ready');
});

bot.on('message', function(msg){
    if(msg.content.startsWith("$") && msg.channel.name == config.channel){
        var command = msg.content.split(" "); // split the string by spaces
        switch(command[0]){
        case "$add":
            addTagToDB(command[1], msg.author);
            break;
        case "$sub":
            addUserToList(command[1], msg.author);
            break;
        case "$tag": // getUsersForTag()
            var message = cooldown(getUsersForTag(command[1]), 10000);
            msg.channel.send(message);
            break;
        case "$test":
            addTagToDB("hitagi", msg.author);
            addTagToDB("asuna", msg.author);
            addTagToDB("ddd", msg.author);

            addUserToList("hitagi", msg.author);
            addUserToList("asuna", msg.author);
            var message = createMessageForTag("hitagi");
            msg.channel.send(message);
        }
    }
});

bot.login(config.token);

/*
  ==SCHEDULE==
  Every day at noon send each daily art seperated by 20 seconds.
*/
schedule.scheduleJob({hour: 12, minute: 00}, function(){
    for(var i=0; i<db.length; i++){
        (function (index){ // closure to stop the loop completing
            setTimeout(function(){
                var msg = createMessageForTag(db[index].tag);
                if(db[index].users.length > 0)
                    bot.channels.find('name', config.channel).send(msg, new Discord.Attachment());
            }, i * 20000); // every 20 seconds execute the codeblock;
        })(i);
    }
});



/*
  ==MESSAGE CREATION=
  creates a message for the given tag (mentions users from db)
*/
function createMessageForTag(tag){
    var tags = db.find(item => item.tag === tag); // get user list
    try{
        var users = tags.users;
    }catch(e){
        console.log(e);
        return "Tag does not exist : /";
    }
    if(users.length < 1){ // make sure there are users
        return "There are no users subscribed : /";
    }
    var message = "Daily " + tag.split('_')[0] + " "; // get only first name in tag
    
    for(var i=0; i<users.length; i++){
        message += "<@" + users[i] + "> "; // add the tags for users
    }
    message += "\n"; // add newline to seperate users from image
    
    
    console.log(message);
    return message;
    
}

/*
  == DATABASE ==
  The database operates under chunks of the following data
  tag: // the safebooru tag that is being pulled from
  - hash[] // array of hashes of posted art
  - user[] // array of subscribed users

  EX:
  senjougahara_hitagi: // assume this is a safebooru tag
  - [F39019019239, 5C9028045203] // assume these are MD5 hashes of files
  - [029349023490] // assume this is a userID
*/

/*
  Add a given tag to the subscribable list
  author is passed to check if the user is admin
*/

function addTagToDB(tag, user){
    if(user.id == config.owner){ // TODO: checking to see if the tag exists
        db.push({"tag":tag, "hashes":[],"users":[]});
    }
}

/*
  add a given user to the subscription list of a given girl
*/
function addUserToList(tag, user){
    try{
        db.find(item => item.tag === tag).users.push(user.id);
    }catch(exception){
        console.log(exception);
    }
}

/*
  for the $tag command
*/
function getUsersForTag(tag){
    try{
        var users = db.find(item => item.tag === tag).users; // get the tag list
    } catch (e){
        console.log(e);
        return "No users subscribed : /";
    }

    if(users == undefined){ 
        console.log("No users subscribed : /");
        return "No users subscribed : /";
    }

    // capitalize the name of the tag
    var message = tag.charAt (0).toUpperCase() + tag.slice(1) + "\n";
    if(users.length < 1) return; // make sure there are users subscribed

    for(var i=0; i<users.length; i++){
        message += "<@" + users[i] + "> "; // tag every user in the list
    }
    
    return message;
}

/*==CHECKING FUNCTIONS==*/
/*
  returns true if tag is in database of tags added
  returns false if tag is not in database of tags
*/
function tagInDB(tag){
    return false; // returns false for now. TODO: implement properly
}

// check if the user is already subscribed to a given tag
function userSubscribed(tag, user){
    return false;
}

/*==DANBOORU FUNCTIONS==*/

function getPost(tag){
    booru.posts({
        limit: 1,
        tags: tag,
        random: true
    }).then(async posts => {
        return posts[0];
    });
}

