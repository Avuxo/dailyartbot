const readline = require('readline');
const discord = require('discord.js');
const bot = new discord.Client();
const jsonfile = require('jsonfile');
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

/*
  Load the database into memory (restores the state of the previous instance)
  In order for the bot to run, db/db.json must exist.
*/
var db = jsonfile.readFileSync("./db/db.json");
var cooldowns = [];

/*setup readline*/
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/*input REPL*/
rl.on('line', (input) => { eval(input); });

bot.on('ready', () => {
    console.log('ready');
});

/*listen for messages*/
bot.on('message', (msg) => {
    if(msg.content.startsWith("$") && // is it a command?
       config.channel.includes(msg.channel.name) || // is it in the msg channel?
       config.cmdChannel.includes(msg.channel.name)){ // is it in the command channel?
        msg.content = msg.content.toLowerCase(); // lowercase the input to stop case-sensitivity.
        var command = msg.content.split(" "); // split the string by spaces
        switch(command[0]){
        case "$add": // add a tag
            if(config.cmdChannel.includes(msg.channel.name)){
                addTagToDB(command[1], msg.author, () => {
                    writeDBToFile("db/db.json"); // write the new DB with the tag
                });
            }
            break;
        case "$sub": // subscribe to a tag
            if(config.cmdChannel.includes(msg.channel.name)){
                addUserToList(command[1], msg.author, (res) => {
                    writeDBToFile("db/db.json");
                    msg.channel.send(res);
                });
                
            }
            break;
        case "$subs": // get a list of subscribed tags
            if(config.cmdChannel.includes(msg.channel.name)){
                let tags = getSubscriptions(msg.author);
                msg.author.createDM().then( (res) => {
                    res.send(tags);
                });
            }
            
            break;
        case "$tag": // getUsersForTag()
            if(config.channel.includes(msg.channel.name)){
            var tags = command.slice(1); // convert to list of tokens
            cooldown( () => { // only executable once every 2 seconds
                for(var i=0; i<tags.length; i++){
                    var message = getUsersForTag(tags[i]);
                    msg.channel.send(message);
                }
            }, 2000, "test");
            }
            
            break;
        case "$unsub":
            if(config.cmdChannel.includes(msg.channel.name)){        
                cooldown( () => {
                    unsubscribeUser(command[1], msg.author, (res) => {
                        msg.channel.send(res);
                    });
                }, 2000, "unsub");
            }
            break;
        case "$rename":
            rename(command[1], command[2], msg.author, () => {
                msg.channel.send("Renamed " + command[1] + " to " + command[2]);
            });
            break;
        case "$list": // DM the list of tags
            if(config.cmdChannel.includes(msg.channel.name)){
                var message = getAllTags();
                msg.author.createDM().then( (res) => {
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


/* ==MESSAGE CREATION= */

/*
  Get a list of all existing tags (for the $tag command)
*/
function getAllTags(){
    var tags = [];
    for(var i=0; i<db.length; i++){
        tags.push(db[i].tag);
    }
    tags.sort(); // sort alphabetically

    var msg = tags.join('\n'); // separate by newline
    return msg;
}


/*
  get the message for a tag ($tag)
v*/
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
  - hash[] // this is superfluous and exists from a past version of the bot. It exists for the current version because it would be a problem to remove it from the production database.
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
  add a given user to the subscription list of a given girl
*/
function addUserToList(tag, user, callback){
    try{
        // is the user not in the list?
        if(!db.find(item => item.tag === tag).users.includes(user.id)){
            db.find(item => item.tag === tag).users.push(user.id);
            callback("Subscribed.");
        }else{
            callback("User already subscribed.");
        }
    }catch(exception){
        // TODO: tag all bot owners.
        callback("Tag does not exist.");
        console.log(exception);
    }
}
/*
  Unsubscribe a given user from a give tag
*/
function unsubscribeUser(tag, user, callback){
    try{
        // find all the users subscribed to a tag
        let users = db.find(item => item.tag == tag).users;
        let index = users.indexOf(user.id);
        if(index > -1){
            users.splice(index, 1);
            callback("Unsubscribed.");
        } else {
            callback("User not subscribed.");
        }

    } catch(exception) {
        //shh, dont tell the user there was an error...
        //for real, this is done because if a tag doesn't exist it raises an exception.
        callback("User not subscribed.");
        console.log(exception);
    }
}

/*
  Get the list of tags a user is subscribed to
*/
function getSubscriptions(user){
    try{
        // get all tags where the user is the same as the argument
        let totalTags = db.filter(item => item.users.includes(user.id));

        let tags = [];
        for(var i=0; i<totalTags.length; i++){
            tags.push(totalTags[i].tag);
        }
        tags.sort(); // sort alphabetically
        
        let msg = tags.join('\n'); // separate by newline
        
        return "Subscribed tags:\n" + msg;
    } catch(e){
        return "Not subscribed to any tags.";
        console.log(e);
    }
}

/*
  Write the database to a file (save)
  path for main DB: db/db.json
  path for backup DB: db/backup.json
*/
function writeDBToFile(path){
    jsonfile.writeFile(path, db, (err) => {
        console.log("DB Error: " + err);
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
