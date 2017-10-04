const readline = require('readline');
const discord = require('discord.js');
const bot = new discord.Client();
const config = require('./config.json');
//const Danbooru = require('danbooru');

const danb = require('./danb.js');

/*
  testing database
  exists in memory
*/
var db = [];

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
    if(msg.content.startsWith("$")){
        var command = msg.content.split(" "); // split the string by spaces
        switch(command[0]){
        case "$add":
            addTagToDB(command[1], msg.author);
            break;
        case "$sub":
            addUserToList(command[1], msg.author);
            break;
        case "$test":
            danb("senjougahara_hitagi");
        }
    }
});

bot.login(config.token);


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

/*==CHECKING FUNCTIONS==*/
/*
  returns true if tag is in database of tags added
  returns false if tag is not in database of tags
*/
function tagInDB(tag){
    return false; // returns false for now. TODO: implement properly
}
