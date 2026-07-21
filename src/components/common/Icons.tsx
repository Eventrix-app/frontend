import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
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
export const LocationPin: React.FC<IconProps> = ({ color = '#FFFFFF', size = 12 }) => (
  <Svg width={size} height={size} viewBox="0 0 12 12">
    <Path
      d="M6 0.75C4.90636 0.751241 3.85787 1.18624 3.08455 1.95955C2.31124 2.73287 1.87624 3.78136 1.875 4.875C1.875 8.40469 5.625 11.0705 5.78484 11.182C5.8479 11.2262 5.92302 11.2499 6 11.2499C6.07698 11.2499 6.1521 11.2262 6.21516 11.182C6.375 11.0705 10.125 8.40469 10.125 4.875C10.1238 3.78136 9.68876 2.73287 8.91545 1.95955C8.14213 1.18624 7.09364 0.751241 6 0.75ZM6 3.375C6.29667 3.375 6.58668 3.46297 6.83335 3.6278C7.08003 3.79262 7.27229 4.02689 7.38582 4.30097C7.49935 4.57506 7.52906 4.87666 7.47118 5.16764C7.4133 5.45861 7.27044 5.72588 7.06066 5.93566C6.85088 6.14544 6.58361 6.2883 6.29264 6.34618C6.00166 6.40406 5.70006 6.37435 5.42597 6.26082C5.15189 6.14729 4.91762 5.95503 4.7528 5.70835C4.58797 5.46168 4.5 5.17167 4.5 4.875C4.5 4.47718 4.65804 4.09564 4.93934 3.81434C5.22064 3.53304 5.60218 3.375 6 3.375Z"
      fill={color}
    />
  </Svg>
);
