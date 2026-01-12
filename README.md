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
All Arc Raiders item data is pulled from https://github.com/RaidTheory/arcraiders-data

## Todo

* Setup augment data
    - Different augments have different loadout slots, current item data for augments doesn't seem to have that, need to add it for all the augments
* Advanced Drag-and-drop
    - Augments change loadout screen based on available slots.
    - Drag and drop quick use into dedicated slots based on augment filtering.

Stretch / Neat to have:
* Copy paste loadout. Button (or Ctrl+C) to export loadout to clipboard. Giant json. Ctrl+V or button to import into page.
