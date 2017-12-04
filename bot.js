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
const jsonfile = require('jsonfile');

/*
  testing database
  exists in memory
*/
var db = [];
var cooldowns = [];

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
        case "$add": // add a tag
            addTagToDB(command[1], msg.author);
            break;
        case "$sub": // subscribe to a tag
            cooldown(function(){
                addUserToList(command[1], msg.author);
            }, 300, "commandSub");
            break;
        case "$tag": // getUsersForTag()
            var tags = command.slice(1);
            cooldown(function(){
                if(tags.length < 3){ // only 3 tags lole (this is done to try to ensure that the message isn't >2000 characters)
                    for(var tag in tags){
                        var message = getUsersForTag(tag);
                        msg.channel.send(message);
                    }
                }
            }, 1000, "commandTag");
            
            break;
        }
    }
});

//bot.login(config.token);


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
    } else {
        console.log("User is not authenticated for this action")
    }
}

/*
  RL test.
  Only to be called from readline as a test (userIDs are random).
*/
function test(){
    addTagToDB("hitagi", 2);
    addTagToDB("asuna", 2);
    addTagToDB("emilia", 2);
    addTagToDB("Togame", 2);

    for(var i=0; i<12; i++){
        addUserToList("hitagi", {id: "98109283019283" + i});
        addUserToList("asuna", {id: "98109283019283" + i});
        addUserToList("emilia", {id: "98109283019283" + i});
        addUserToList("Togame", {id:"98109283019283" + i});
    }


    var tags = ["hitagi", "asuna", "Togame"];
    cooldown(function(){
        for(var i=0; i<3; i++){
            var message = getUsersForTag(tags[i]);
            //msg.channel.send(message);
            console.log(message);
        }
    }, 2000, "test");
   
}

/*
  add a given user to the subscription list of a given girl
*/
function addUserToList(tag, user){
    try{
        if(db.find(item => item.tag === tag).users.indexOf(user) > -1)
            db.find(item => item.tag === tag).users.push(user.id);
    }catch(exception){
        console.log(exception);
    }
}
/*
  Write the database to a file (save)
  path for main DB: db/db.json
  path for backup DB: db/backup.json
*/
function writeDBToFile(path){
    jsonfile.writeFile(path, db, function(err) { console.log("DB Error: " + err) });}

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
/*
  run a function and check if it can be run again

  A cooldown is written like 
  {
      func: "functionName", 
      timeout: timeAmount, 
      timestamp: lastRunTime
  }
  The timestamp is the timestamp of the last call through cooldown.
  As the function is called the timeout is checked against the current time.
  If the timeout is < currentTime + timeout, run the function.
*/
function cooldown(funcToCooldown, cooldownTime, identifier){
    console.log(cooldowns);
    cd = cooldowns[identifier]
    
    if(typeof(cd) == 'undefined'){
        cooldowns[identifier] = 
            {
                func: identifier,
                timeout: cooldownTime,
                timestamp: Date.now()
            };
        funcToCooldown();
    } else {
        console.log(cd);
        if(typeof(cd) != 'undefined' && cd.timestamp + cd.timeout < Date.now()){
            funcToCooldown();
            cooldowns[identifier] = 
                {
                    func: identifier,
                    timeout: cooldownTime,
                    timestamp: Date.now()
                };
        } else {
            console.log("You're doing that too fast, slow down.");
        }
    }
}
