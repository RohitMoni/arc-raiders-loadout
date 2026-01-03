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


## Todo

* Setup Loadout Screen Base
    - Get a background image
    - Setup the loadout screen grid + side inventory space
    - Setup the loadout item loot list space off to the right side.
* Setup augment data
    - Different augments have different loadout slots, current item data for augments doesn't seem to have that, need to add it for all the augments
* Setup inventory
    - Inventory should just be a giant list of every potential loadout item: Augments, shields, weapons, ammo, attachments, quick use, raider hatch keys. Ideally with tabs + a search bar.
* Setup selection and drag and drop
    - Left-click drag inventory items into the grid slots.
    - Left-click drag items from the loadout slots off to either side (back into inventory or outside loadout) to remove it.
    - Shift-left-click or right click loadout item to remove.
* Advanced Drag-and-drop
    - Filtered drag: Can only drag augments into augment slot, shields into shield slot, etc.
    - Augments change loadout screen based on available slots.
    - Drag and drop attachments onto and off of guns
    - Drag and drop quick use into dedicated slots based on augment filtering.
* Loadout loot required
    - For each item in the loadout, find items required and fill out the loot table on the right side. Update as items are added or removed.

Stretch / Neat to have:
* Copy paste loadout. Button (or Ctrl+C) to export loadout to clipboard. Giant json. Ctrl+V or button to import into page.
