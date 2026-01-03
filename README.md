# Arc Raiders Loadout Looter

Figure out what you need to loot to keep your loadout going.

## Requirements

[nodejs + npm](https://nodejs.org/en/download/)

## Getting Started

* Clone the repo
* Run `npm install`

### Local 

* Run `npm run dev` to host a local server that you can see in your browser

### Remote

* Pushing anything to `main` will auto-deploy to https://arc-raiders-loadout-looter.vercel.app/

## High level architecture

Using Vite + React.
Deployed on [Vercel](https://vercel.com/).
This is a client-side application, no auth, no database.
All Arc Raiders item data is pulled from https://github.com/RohitMoni/arc-raiders-data, which is a fork of https://github.com/RaidTheory/arcraiders-data


