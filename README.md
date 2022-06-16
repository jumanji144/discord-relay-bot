## Discord relay bot
Discord bot to realy twitch chat on discord with emote and badge support.

## Setup
To setup just enter the information into the twitch/config.json and discord/config.json files.
Discord:
```json
{
    "token": "DISCORD TOKEN",
    "channel": "TARGET CHANNEL ID",
    "emojiGuild": "EMOJI GUILD ID"
}   
```
The emoji guild is so that you can have as much emojis as possible in the discord channel without having to clutter your guild with emojis.
Twitch:
To use the bot you need to first create a twitch application, to figure out how follow this link:
[](https://dev.twitch.tv/docs/authentication/register-app).
```json
{
   "clientID": "CLIENT ID",
   "clientSecret": "CLIENT SECRET",
   "channel": "TargetChannel"
}
```

## The node-twitch library
For whom it may concern, the node-twitch library is here specified directly because the original NPM project doesn't have the features and the owner of it
didn't merge my PR yet ;). So i had to include it here directly.