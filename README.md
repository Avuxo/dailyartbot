# dailyartbot
A Discord bot that allows users to tag subscribed users in posts.

## Usage

### Setup

In order to setup the project, first install the dependencies using `$ npm install`.

For the bot to function, there needs to be a `creds.json` file.
```json
{
    "token" : "botTokenFromDiscord",
    "owner" : ["ownerOfBotsUserID", "secondOwnerId"],
    "channel" : ["nameOfChannel", "secondNameOfChannel"],
    "cmdChannel" : "nameOfChannelForCommands"
}
```

Furthermore, you need to have a directory called `db` that contains a `db.json` file with an empty json object.

### usage

dailartbot has a variety of commands. The primary function of the bot is to subscribe to posts of a certain type so that you can be tagged in them.


`$add <tag>` adds a tag to the database for users to subscribe to (cmdChannel). OWNER ONLY.

`$sub <tag>` subscribes a user to a tag in the databse (cmdChannel).

`$unsub <tag>` unsubscribes a user from a tag in the database (cmdChannel).

`$tag <tag>` Tags the users subscribed to the tag (channel).

`$rename <tag from> <tag to>` Rename a given tag to a different name (cmdChannel). OWNER ONLY.

`$list` DMs the user a list of available tags (cmdChannel).

`$write` manually write the database to a file (cmdChannel). OWNER ONLY.
