const readline = require('readline');
const discord = require('discord.js');
const bot = new discord.Client();
/*
  There can be more than one owner, and more than one channel.
  The cmdChannel is used for all commands except for $tag.
  $tag operates in the channels listed in `channel`.
  There is only one command channel due to its original use. This is fixed trivially.

  {
    "token" : "botTokenFromDiscord",
    "owner" : ["ownerOfBotsUserID"],
    "channel" : ["nameOfChannel"],
    "cmdChannel" : "nameOfChannelForCommands"
  }

*/
const config = require('./config.json');
const Danbooru = require('danbooru');
const schedule = require('node-schedule');
const jsonfile = require('jsonfile');

/*
  testing database
  exists in memory
  In order for the bot to run, db/db.json must exist.
*/
var db = jsonfile.readFileSync("./db/db.json");
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
    if(msg.content.startsWith("$") &&
       config.channel.includes(msg.channel.name) ||
       config.cmdChannel.includes(msg.channel.name)){
        msg.content = msg.content.toLowerCase();
        var command = msg.content.split(" "); // split the string by spaces
        switch(command[0]){
        case "$add": // add a tag
            if(config.cmdChannel.includes(msg.channel.name)){
                addTagToDB(command[1], msg.author, function(){
                    writeDBToFile("db/db.json"); // write the new DB with the tag
                });
            }
            break;
        case "$sub": // subscribe to a tag
            if(config.cmdChannel.includes(msg.channel.name)){
                addUserToList(command[1], msg.author);
                writeDBToFile("db/db.json");
                msg.channel.send("Subscribed");
            }
            break;
        case "$tag": // getUsersForTag()
            if(config.channel.includes(msg.channel.name)){
            var tags = command.slice(1); // convert to list of tokens
            cooldown(function(){ // only executable once every 2 seconds
                for(var i=0; i<tags.length; i++){
                    var message = getUsersForTag(tags[i]);
                    msg.channel.send(message);
                }
            }, 2000, "test");
            }
            
            break;
        case "$unsub":
            if(config.cmdChannel.includes(msg.channel.name)){        
                cooldown(function(){
                    unsubscribeUser(command[1], msg.author);
                }, 2000, "unsub");
            }
            break;
        case "$rename":
            rename(command[1], command[2], msg.author, function(){
                msg.channel.send("Renamed " + command[1] + " to " + command[2]);
            });
            break;
        case "$list": // DM the list of tags
            if(config.cmdChannel.includes(msg.channel.name)){
                var message = getAllTags();
                msg.author.createDM().then(function(res){
                    res.send("Tags:\n" + message);
                });
            }
            break;
        case "$write": // write to the database manually
            if(config.owner.includes(msg.author.id)){
                writeDBToFile("db/db.json");
                msg.channel.send("Written to DB");
            }
        }
    }
});

bot.login(config.token);


/*
  ==MESSAGE CREATION=
  creates a message for the given tag (mentions users from db)
*/

/*
  for the $list command
*/
function getAllTags(){
    var msg = "";
    for(var i=0; i<db.length; i++){
        msg += db[i].tag + "\n";
    }
    return msg;
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

    if(users.length === 0){
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


/*
  == DATABASE ==
  The database operates under chunks of the following data
  - tag // the safebooru tag that is being pulled from
  - hash[] // array of hashes of posted art
  - user[] // array of subscribed users

  EX:
  - senjougahara_hitagi // assume this is a safebooru tag
  - [F39019019239, 5C9028045203] // assume these are MD5 hashes of files
  - [029349023490] // assume this is a userID
*/

/*
  Add a given tag to the subscribable list
  author is passed to check if the user is admin
*/

function addTagToDB(tag, user, callback){
    if(config.owner.includes(user.id)){ // TODO: checking to see if the tag exists
        db.push({"tag":tag, "hashes":[],"users":[]});
        callback("db/db.json");
    } else {
        console.log("User is not authenticated for this action")
    }
}

/*
  Rename a tag
*/
function rename(from, to, user, callback){
    if(config.owner.includes(user.id)){ // TODO: checking to see if the tag exists
        let obj = JSON.stringify(db).replace(from, to);
        db = JSON.parse(obj);
        callback();
    } else {
        console.log('user not authenticated');
    }
}

/*
  RL test.
  Only to be called from readline as a test (userIDs are random).
  This function is not functionally in use except for in the process of setting up a testing database.
*/
function test(){
    addTagToDB("hitagi", 2);
    addTagToDB("asuna", 2);
    addTagToDB("emilia", 2);
    addTagToDB("Togame", 2);

    for(var i=0; i<2; i++){
        addUserToList("hitagi", {id: "98109283019283" + i});
        addUserToList("asuna", {id: "98109283019283" + i});
        addUserToList("emilia", {id: "98109283019283" + i});
        addUserToList("Togame", {id:"98109283019283" + i});
    }


    var tags = ["hitagi", "asuna", "Togame"];
    
   
}

/*
  add a given user to the subscription list of a given girl
*/
function addUserToList(tag, user){
    try{
        // is the user not in the list?
        if(!db.find(item => item.tag === tag).users.includes(user.id))
            db.find(item => item.tag === tag).users.push(user.id);
        else
            console.log("User already subscribed.");
    }catch(exception){
        console.log(exception);
    }
}
/*
  Unsubscribe a given user from a give tag
*/
function unsubscribeUser(tag, user){
    try{
        // find all the users subscribed to a tag
        let users = db.find(item => item.tag == tag).users;
        let index = users.indexOf(user.id);
        if(index > -1){
            users.splice(index, 1);
        }
    } catch(exception) {
        console.log(exception);
    }
}

/*
  Write the database to a file (save)
  path for main DB: db/db.json
  path for backup DB: db/backup.json
*/
function writeDBToFile(path){
    jsonfile.writeFile(path, db, function(err) {
        console.log("DB Error: " + err);
    });
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
    cd = cooldowns[identifier]

    // does this cooldown already exist?
    if(typeof(cd) == 'undefined'){
        // create a new cooldown for the function
        cooldowns[identifier] = 
            {
                func: identifier,
                timeout: cooldownTime,
                timestamp: Date.now()
            };
        funcToCooldown(); // call the function that's being cooled down.
    } else {
        // if the cooldown exists in the list and the cooldown time has elapsed.
        if(typeof(cd) != 'undefined' && cd.timestamp + cd.timeout < Date.now()){
            funcToCooldown(); // call the cooldowned function
            // add the cooldown to the list
            cooldowns[identifier] = 
                {
                    func: identifier,
                    timeout: cooldownTime,
                    timestamp: Date.now()
                };
        } else { // time has not yet elapsed
            console.log("You're doing that too fast, slow down.");
        }
    }
}
