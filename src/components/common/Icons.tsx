import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface IconProps {
  color?: string;
  size?: number;
}

export const RightArrow: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z" fill={color} />
  </Svg>
);

export const LeftArrow: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" fill={color} />
  </Svg>
);

interface NotificationBellIconProps extends IconProps {
  /** Shows the "has notifications" bell shape (clapper offset, no bottom seam) instead of the plain outline. */
  unread?: boolean;
}

const BELL_PATH =
  'M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z';

const BELL_UNREAD_PATH =
  'M480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80Zm0-420ZM160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v13q-11 22-16 45t-4 47q-10-2-19.5-3.5T480-720q-66 0-113 47t-47 113v280h320v-257q18 8 38.5 12.5T720-520v240h80v80H160Zm475-435q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Z';

// Same Material Symbols bell used for the header notification button on Home/Bookings —
// shared here so both screens render an identical icon (and unread-dot behavior) instead
// of each keeping its own copy of the path data.
export const NotificationBell: React.FC<NotificationBellIconProps> = ({
  color = '#000000',
  size = 24,
  unread = false,
}) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path d={unread ? BELL_UNREAD_PATH : BELL_PATH} fill={color} />
  </Svg>
);

// Same pin used for the per-event distance badge (assets/events/distance-1.svg /
// EventInterestCard's DISTANCE_BADGE_SVG) — reused here for the logged-in user's own
// location on Home/Profile so both read as "the same kind of pin," and shared here so
// both screens render it identically instead of each keeping their own copy.
// assets/icons/menu-close.svg — plain 3-line hamburger, shown while the management menu
// is collapsed (tap to open it).
export const MenuCloseIcon: React.FC<IconProps> = ({ color = '#000000', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" fill={color} />
  </Svg>
);

// assets/icons/menu-open.svg — hamburger-with-arrow, shown while the management menu is
// expanded (tap to close it back down).
export const MenuOpenIcon: React.FC<IconProps> = ({ color = '#000000', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M120-240v-80h520v80H120Zm664-40L584-480l200-200 56 56-144 144 144 144-56 56ZM120-440v-80h400v80H120Zm0-200v-80h520v80H120Z"
      fill={color}
    />
  </Svg>
);

export const LocationPin: React.FC<IconProps> = ({ color = '#FFFFFF', size = 12 }) => (
  <Svg width={size} height={size} viewBox="0 0 12 12">
    <Path
      d="M6 0.75C4.90636 0.751241 3.85787 1.18624 3.08455 1.95955C2.31124 2.73287 1.87624 3.78136 1.875 4.875C1.875 8.40469 5.625 11.0705 5.78484 11.182C5.8479 11.2262 5.92302 11.2499 6 11.2499C6.07698 11.2499 6.1521 11.2262 6.21516 11.182C6.375 11.0705 10.125 8.40469 10.125 4.875C10.1238 3.78136 9.68876 2.73287 8.91545 1.95955C8.14213 1.18624 7.09364 0.751241 6 0.75ZM6 3.375C6.29667 3.375 6.58668 3.46297 6.83335 3.6278C7.08003 3.79262 7.27229 4.02689 7.38582 4.30097C7.49935 4.57506 7.52906 4.87666 7.47118 5.16764C7.4133 5.45861 7.27044 5.72588 7.06066 5.93566C6.85088 6.14544 6.58361 6.2883 6.29264 6.34618C6.00166 6.40406 5.70006 6.37435 5.42597 6.26082C5.15189 6.14729 4.91762 5.95503 4.7528 5.70835C4.58797 5.46168 4.5 5.17167 4.5 4.875C4.5 4.47718 4.65804 4.09564 4.93934 3.81434C5.22064 3.53304 5.60218 3.375 6 3.375Z"
      fill={color}
    />
  </Svg>
);

// --- Material Symbols (outlined, viewBox "0 -960 960 960") icons below ---
// Added to replace emoji standing in for functional UI glyphs (buttons, status badges,
// list-row leading icons) across event cards / screens. Each one component is deliberately
// reused across every emoji that means the same thing, rather than adding a near-duplicate
// per screen — see the call sites for which emoji each one replaces.

// Replaces 📅 / 🗓️ (date meta rows, "when-n-where" date line, "Edit Schedule" menu item).
export const CalendarIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Zm300 230q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-188.5-11.5Q280-423 280-440t11.5-28.5Q303-480 320-480t28.5 11.5Q360-457 360-440t-11.5 28.5Q337-400 320-400t-28.5-11.5ZM640-400q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-188.5-11.5Q280-263 280-280t11.5-28.5Q303-320 320-320t28.5 11.5Q360-297 360-280t-11.5 28.5Q337-240 320-240t-28.5-11.5ZM640-240q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🕐 (time meta rows, "when-n-where" time line, recent-search list icon).
export const ClockIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="m627-287 45-45-159-160v-201h-60v225l174 181ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Zm0-400Zm0 340q140 0 240-100t100-240q0-140-100-240T480-820q-140 0-240 100T140-480q0 140 100 240t240 100Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🎟️ / 🎫 (ticket price tag, quick-info entry type, "Manage Ticket Types" menu item,
// ticket detail row).
export const TicketIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M480-283q12 0 21-9t9-21q0-12-9-21t-21-9q-12 0-21 9t-9 21q0 12 9 21t21 9Zm0-167q12 0 21-9t9-21q0-12-9-21t-21-9q-12 0-21 9t-9 21q0 12 9 21t21 9Zm0-167q12 0 21-9t9-21q0-12-9-21t-21-9q-12 0-21 9t-9 21q0 12 9 21t21 9Zm340 457H140q-24.75 0-42.37-17.63Q80-195.25 80-220v-153q37-8 61.5-37.5T166-480q0-40-24.5-70T80-587v-153q0-24.75 17.63-42.38Q115.25-800 140-800h680q24.75 0 42.38 17.62Q880-764.75 880-740v153q-37 7-61.5 37T794-480q0 40 24.5 69.5T880-373v153q0 24.75-17.62 42.37Q844.75-160 820-160Zm0-60v-109q-38-26-62-65t-24-86q0-47 24-86t62-65v-109H140v109q39 26 62.5 65t23.5 86q0 47-23.5 86T140-329v109h680ZM480-480Z"
      fill={color}
    />
  </Svg>
);

// Replaces 👤 (organizer avatar, review avatar fallback, shorts creator avatar).
export const PersonIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M372-523q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42ZM160-160v-94q0-38 19-65t49-41q67-30 128.5-45T480-420q62 0 123 15.5T731-360q31 14 50 41t19 65v94H160Zm60-60h520v-34q0-16-9.5-30.5T707-306q-64-31-117-42.5T480-360q-57 0-111 11.5T252-306q-14 7-23 21.5t-9 30.5v34Zm324.5-346.5Q570-592 570-631t-25.5-64.5Q519-721 480-721t-64.5 25.5Q390-670 390-631t25.5 64.5Q441-541 480-541t64.5-25.5ZM480-631Zm0 411Z"
      fill={color}
    />
  </Svg>
);

// Replaces 👥 (quick-info capacity card).
export const PeopleIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M38-160v-94q0-35 18-63.5t50-42.5q73-32 131.5-46T358-420q62 0 120 14t131 46q32 14 50.5 42.5T678-254v94H38Zm700 0v-94q0-63-32-103.5T622-423q69 8 130 23.5t99 35.5q33 19 52 47t19 63v94H738ZM250-523q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42Zm426 0q-42 42-108 42-11 0-24.5-1.5T519-488q24-25 36.5-61.5T568-631q0-45-12.5-79.5T519-774q11-3 24.5-5t24.5-2q66 0 108 42t42 108q0 66-42 108ZM98-220h520v-34q0-16-9.5-31T585-306q-72-32-121-43t-106-11q-57 0-106.5 11T130-306q-14 6-23 21t-9 31v34Zm324.5-346.5Q448-592 448-631t-25.5-64.5Q397-721 358-721t-64.5 25.5Q268-670 268-631t25.5 64.5Q319-541 358-541t64.5-25.5ZM358-220Zm0-411Z"
      fill={color}
    />
  </Svg>
);

// Replaces 💬 (organizer "message" action button).
export const ChatIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M240-399h313v-60H240v60Zm0-130h480v-60H240v60Zm0-130h480v-60H240v60ZM80-80v-740q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240L80-80Zm134-220h606v-520H140v600l74-80Zm-74 0v-520 520Z"
      fill={color}
    />
  </Svg>
);

// Replaces 📞 (organizer "call" action button).
export const PhoneIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M795-120q-116 0-236.5-56T335-335Q232-438 176-558.5T120-795q0-19.29 12.86-32.14Q145.71-840 165-840h140q14 0 24 10t14 25l26.93 125.64Q372-665 369.5-653.5t-10.73 19.73L259-533q26 44 55 82t64 72q37 38 78 69.5t86 55.5l95-98q10-11 23.15-15 13.15-4 25.85-2l119 26q15 4 25 16.04 10 12.05 10 26.96v135q0 19.29-12.86 32.14Q814.29-120 795-120ZM229-588l81-82-23-110H180q2 42 13.5 88.5T229-588Zm369 363q41 19 89 31t93 14v-107l-103-21-79 83ZM229-588Zm369 363Z"
      fill={color}
    />
  </Svg>
);

// Replaces 📣 / 📢 ("Post Announcement" menu item, notification "event_changed" type icon).
export const MegaphoneIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M730-450v-60h150v60H730Zm50 290-121-90 36-48 121 90-36 48Zm-82-503-36-48 118-89 36 48-118 89ZM210-200v-160h-70q-24.75 0-42.37-17.63Q80-395.25 80-420v-120q0-24.75 17.63-42.38Q115.25-600 140-600h180l200-120v480L320-360h-50v160h-60Zm250-146v-268l-124 74H140v120h196l124 74Zm100 0v-268q27 24 43.5 58.5T620-480q0 41-16.5 75.5T560-346ZM300-480Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🚫 ("Cancel Event" menu item).
export const BanIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5ZM480-140q61.01 0 117.51-20.5Q654-181 699-220L220-699q-38 46-59 102.17T140-480q0 142.37 98.81 241.19Q337.63-140 480-140Zm259-121q37-45 59-101.49 22-56.5 22-117.51 0-142.38-98.81-241.19T480-820q-60.66 0-116.83 21T261-739l478 478ZM480-480Z"
      fill={color}
    />
  </Svg>
);

// Replaces 📋 ("Manage Event" menu item) and 📝 ("Draft" status banner) — both read as
// "document/notes", so one clipboard glyph covers both instead of near-duplicate icons.
export const ClipboardIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M180-120q-24.75 0-42.37-17.63Q120-155.25 120-180v-600q0-24.75 17.63-42.38Q155.25-840 180-840h205q5-35 32-57.5t63-22.5q36 0 63 22.5t32 57.5h205q24.75 0 42.38 17.62Q840-804.75 840-780v600q0 24.75-17.62 42.37Q804.75-120 780-120H180Zm0-60h600v-600H180v600Zm100-100h273v-60H280v60Zm0-170h400v-60H280v60Zm0-170h400v-60H280v60Zm224.5-187.5Q515-818 515-832t-10.5-24.5Q494-867 480-867t-24.5 10.5Q445-846 445-832t10.5 24.5Q466-797 480-797t24.5-10.5ZM180-180v-600 600Z"
      fill={color}
    />
  </Svg>
);

// Replaces ✅ ("Approved" sales banner, "Check In Attendees" menu item, verification status).
export const CheckCircleIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="m421-298 283-283-46-45-237 237-120-120-45 45 165 166Zm59 218q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"
      fill={color}
    />
  </Svg>
);

// A plain X — dismiss/cancel affordances (sheet close buttons, cancelling an in-progress
// upload). Distinct from MenuCloseIcon above, which despite the name is a *hamburger*: it
// means "the menu is open, tap to collapse it" and is only correct paired with MenuOpenIcon.
// Using it as a generic close button renders three bars where an X is intended.
export const CloseIcon: React.FC<IconProps> = ({ color = '#000000', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M256-200l-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"
      fill={color}
    />
  </Svg>
);

// Replaces ❌ ("Event Rejected" banner).
export const CloseCircleIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="m330-288 150-150 150 150 42-42-150-150 150-150-42-42-150 150-150-150-42 42 150 150-150 150 42 42ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"
      fill={color}
    />
  </Svg>
);

// Replaces ⚠️ (empty/error states, verification-rejected status).
export const WarningIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="m40-120 440-760 440 760H40Zm104-60h672L480-760 144-180Zm361.5-65.68q8.5-8.67 8.5-21.5 0-12.82-8.68-21.32-8.67-8.5-21.5-8.5-12.82 0-21.32 8.68-8.5 8.67-8.5 21.5 0 12.82 8.68 21.32 8.67 8.5 21.5 8.5 12.82 0 21.32-8.68ZM454-348h60v-224h-60v224Zm26-122Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🔍 (search buttons/inputs).
export const SearchIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M796-121 533-384q-30 26-70 40.5T378-329q-108 0-183-75t-75-181q0-106 75-181t182-75q106 0 180.5 75T632-585q0 43-14 83t-42 75l264 262-44 44ZM377-389q81 0 138-57.5T572-585q0-81-57-138.5T377-781q-82 0-139.5 57.5T180-585q0 81 57.5 138.5T377-389Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🔒 (locked ticket-tier badge).
export const LockIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M220-80q-24.75 0-42.37-17.63Q160-115.25 160-140v-434q0-24.75 17.63-42.38Q195.25-634 220-634h70v-96q0-78.85 55.61-134.42Q401.21-920 480.11-920q78.89 0 134.39 55.58Q670-808.85 670-730v96h70q24.75 0 42.38 17.62Q800-598.75 800-574v434q0 24.75-17.62 42.37Q764.75-80 740-80H220Zm0-60h520v-434H220v434Zm314.5-162.03Q557-324.06 557-355q0-30-22.67-54.5t-54.5-24.5q-31.83 0-54.33 24.5t-22.5 55q0 30.5 22.67 52.5t54.5 22q31.83 0 54.33-22.03ZM350-634h260v-96q0-54.17-37.88-92.08-37.88-37.92-92-37.92T388-822.08q-38 37.91-38 92.08v96ZM220-140v-434 434Z"
      fill={color}
    />
  </Svg>
);

// Replaces ❤️ (saved-events empty state, shorts "like" action).
export const HeartIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="m480-121-41-37q-105.77-97.12-174.88-167.56Q195-396 154-451.5T96.5-552Q80-597 80-643q0-90.15 60.5-150.58Q201-854 290-854q57 0 105.5 27t84.5 78q42-54 89-79.5T670-854q89 0 149.5 60.42Q880-733.15 880-643q0 46-16.5 91T806-451.5Q765-396 695.88-325.56 626.77-255.12 521-158l-41 37Zm0-79q101.24-93 166.62-159.5Q712-426 750.5-476t54-89.14q15.5-39.13 15.5-77.72 0-66.14-42-108.64T670.22-794q-51.52 0-95.37 31.5T504-674h-49q-26-56-69.85-88-43.85-32-95.37-32Q224-794 182-751.5t-42 108.82q0 38.68 15.5 78.18 15.5 39.5 54 90T314-358q66 66 166 158Zm0-297Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🗑️ (saved-events "remove" menu row).
export const TrashIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M261-120q-24.75 0-42.37-17.63Q201-155.25 201-180v-570h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18H261Zm438-630H261v570h438v-570ZM367-266h60v-399h-60v399Zm166 0h60v-399h-60v399ZM261-750v570-570Z"
      fill={color}
    />
  </Svg>
);

// Replaces 💸 (refund empty state) and 💳 (notification "refund_status" type icon) — both
// read as "money/payments", so one wallet glyph covers both.
export const WalletIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M540-420q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM220-280q-24.75 0-42.37-17.63Q160-315.25 160-340v-400q0-24.75 17.63-42.38Q195.25-800 220-800h640q24.75 0 42.38 17.62Q920-764.75 920-740v400q0 24.75-17.62 42.37Q884.75-280 860-280H220Zm100-60h440q0-42 29-71t71-29v-200q-42 0-71-29t-29-71H320q0 42-29 71t-71 29v200q42 0 71 29t29 71Zm480 180H100q-24.75 0-42.37-17.63Q40-195.25 40-220v-460h60v460h700v60ZM220-340v-400 400Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🖼️ (gallery/review-avatar image placeholders).
export const PhotoIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm0-60h600v-600H180v600Zm56-97h489L578-473 446-302l-93-127-117 152Zm-56 97v-600 600Z"
      fill={color}
    />
  </Svg>
);

// Replaces 📴 (check-in offline banner).
export const WifiOffIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M805-69 411-463q-54 13-99.5 42T232-357l-63-63q37-37 76.5-65t94.5-50L229-646q-47 23-89 54.5T63-526L0-589q36-37 77-69t84-55l-92-92 43-43 736 736-43 43Zm-388-85q-27-27-27-63t27-63q27-27 63-27t63 27q27 27 27 63t-27 63q-27 27-63 27t-63-27Zm311-203q-33-32-60-51.5T599-447L486-560q95 2 167.5 39T791-420l-63 63Zm169-169q-88-84-192.5-134T480-710q-37 0-71 4.5T352-693l-73-73q44-16 95.5-25t105.5-9q140 0 263.5 58T960-589l-63 63Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🔄 (check-in "syncing queued check-ins" banner).
export const SyncIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M167-160v-60h130l-15-12q-64-51-93-111t-29-134q0-106 62.5-190.5T387-784v62q-75 29-121 96.5T220-477q0 63 23.5 109.5T307-287l30 21v-124h60v230H167Zm407-15v-63q76-29 121-96.5T740-483q0-48-23.5-97.5T655-668l-29-26v124h-60v-230h230v60H665l15 14q60 56 90 120t30 123q0 106-62 191T574-175Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🎪 (missing/empty event image placeholders — card thumbnails and hero image).
export const EventBusyIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="m381-218-43-43 100-99-100-99 43-43 99 100 99-100 43 43-100 99 100 99-43 43-99-100-99 100ZM180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Z"
      fill={color}
    />
  </Svg>
);

// Replaces 📷 (check-in QR/Code tab label, scanner permission placeholder).
export const CameraIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M479.5-267q72.5 0 121.5-49t49-121.5q0-72.5-49-121T479.5-607q-72.5 0-121 48.5t-48.5 121q0 72.5 48.5 121.5t121 49Zm0-60q-47.5 0-78.5-31.5t-31-79q0-47.5 31-78.5t78.5-31q47.5 0 79 31t31.5 78.5q0 47.5-31.5 79t-79 31.5ZM140-120q-24 0-42-18t-18-42v-513q0-23 18-41.5t42-18.5h147l73-87h240l73 87h147q23 0 41.5 18.5T880-693v513q0 24-18.5 42T820-120H140Zm0-60h680v-513H645l-73-87H388l-73 87H140v513Zm340-257Z"
      fill={color}
    />
  </Svg>
);

// Replaces 🎵 (shorts background-music indicator).
export const MusicNoteIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M286.5-163.5Q243-207 243-270t43.5-106.5Q330-420 393-420q28 0 50.5 8t39.5 22v-450h234v135H543v435q0 63-43.5 106.5T393-120q-63 0-106.5-43.5Z"
      fill={color}
    />
  </Svg>
);

// Replaces 📡 (no-internet error screen).
export const RadioTowerIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M198-278q-60-58-89-133T80-560q0-74 29-149t89-133l35 35q-50 49-76.5 116.5T130-560q0 63 26.5 130.5T233-313l-35 35Zm92-92q-40-37-59-89.5T212-560q0-48 19-100.5t59-89.5l35 35q-29 29-46 72.5T262-560q0 35 17.5 79.5T325-405l-35 35Zm4 290 133-405q-17-12-27.5-31T389-560q0-38 26.5-64.5T480-651q38 0 64.5 26.5T571-560q0 25-10.5 44T533-485L666-80h-59l-29-90H383l-30 90h-59Zm108-150h156l-78-238-78 238Zm268-140-35-35q29-29 46-72.5t17-82.5q0-35-17.5-79.5T635-715l35-35q39 37 58.5 89.5T748-560q0 47-19.5 100T670-370Zm92 92-35-35q49-49 76-116.5T830-560q0-63-27-130.5T727-807l35-35q60 58 89 133t29 149q0 75-27.5 149.5T762-278Z"
      fill={color}
    />
  </Svg>
);

// Replaces ↗ (shorts "Share" action).
export const ShareArrowIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path d="m242-246-42-42 412-412H234v-60h480v480h-60v-378L242-246Z" fill={color} />
  </Svg>
);

// WhatsApp icon for organizer contact button.
export const WhatsAppIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      fill={color}
    />
  </Svg>
);

// Replaces ⏳ (pending/awaiting-review status badges).
export const HourglassIcon: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      d="M308-140h344v-127q0-72-50-121.5T480-438q-72 0-122 49.5T308-267v127ZM160-80v-60h88v-127q0-71 40-129t106-84q-66-27-106-85t-40-129v-126h-88v-60h640v60h-88v126q0 71-40 129t-106 85q66 26 106 84t40 129v127h88v60H160Z"
      fill={color}
    />
  </Svg>
);
