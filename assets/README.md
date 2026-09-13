# assets/

Organized by feature/screen, not by file type — you find something by asking
"which screen is it on?", not "is it a PNG or an SVG?". Shared assets (used by
more than one screen) live in `shared/`.

```
app/            App icon, adaptive icon, favicon — app.config.js only.
auth/           Login/register/onboarding screens.
onboarding/     Post-signup carousel (1.jpg, 2.jpg, 3.jpg).
splash/         SplashScreen's intro video.
home/
  categories/   Pre-rendered category cards (see CategoryIconCard.tsx —
                each PNG already bakes in the card chrome, not just an icon).
events/
  tickets/      Ticket-tier stub art (vip/standard/earlybird/ticketbg).
  samples/      Placeholder event photo(s).
location/       Location-access screen.
shorts/         Reels: like-burst animation, sample highlight thumbnails.
shared/
  backgrounds/  Decorative backgrounds reused across screens (e.g. bg.png:
                Home + Profile headers).
  icons/        Raster icons reused across screens (e.g. search.png: Home,
                Explore, Bookings, LocationAccess).
  placeholders/ Generic states: error, offline, no-events, image-frame
                (FallbackImage's loading/failed skeleton), avatar fallback.
svg-source/     NOT wired into the app — see below.
```

## Adding a new asset

Pick the folder for the screen/feature it belongs to (create one if it's a
new area of the app). If it's used by two or more unrelated screens, it goes
in `shared/<kind>/` instead. Reference it the normal way:

```js
const img = require('../../../assets/<folder>/<file>.png');
```

## svg-source/ is not importable

This project has no Metro SVG transformer (no `metro.config.js` entry for
`.svg`), so `require()`-ing a file from here does not work and never has.
Every icon actually rendered in the app is inline SVG markup as a string
constant in `src/components/common/Icons.tsx` (or occasionally inlined
locally, e.g. `CategoryScroller`) — copy the `<path>` data from a file here
into a new `Svg`/`Path` component instead of trying to `require()` it.

Kept rather than deleted because these are the original design exports —
useful as a reference, and at least one (`checked.png`/`unchecked.png`,
under `shared/icons/`, which *is* real PNG so it works fine) exists for a
screen that isn't built yet.

If SVGs need to become real importable assets, the fix is adding
`react-native-svg-transformer` + a `metro.config.js`, not moving files out
of this folder.
