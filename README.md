# Arc Raiders Loadout Looter

Set up your loadout in arc raiders. 
Share it with friends.
Figure out what you need to loot to keep your loadout going.

[Check it out Live!](https://arc-raiders-loadout.vercel.app/)
[Report Issues or Suggest New Features](https://github.com/RohitMoni/arc-raiders-loadout/issues)


This is a hobby project on the side that I'm using to test out coding with Gemini.

## Gemini Stats

* Number of times I've had to dig into the code: 3
* Number of bugs it's created: 7
* Number of times I've just had to do it myself: 4

Note: It utterly failed when doing large-scale data manipulations on the data repo. Ex: For all .json files add x property. It kept trying to load the whole thing into memory / tokens all at once, which exceeded limits. Regex worked for some of this, other times I had to go the manual route.

## Requirements

[nodejs + npm](https://nodejs.org/en/download/)

## Getting Started

* Clone the repo
* Run `npm install`

### Local 

* Run `npm run dev` to host a local server that you can see in your browser

### Deployment

* Pushing / Merges to `main` will auto-deploy to https://arc-raiders-loadout.vercel.app/

## High level architecture

Using Vite + React.
Deployed on [Vercel](https://vercel.com/).
This is a client-side application, no auth, no database.
All Arc Raiders item data is pulled from https://github.com/RohitMoni/arc-raiders-data which is a fork of https://github.com/RaidTheory/arcraiders-data

