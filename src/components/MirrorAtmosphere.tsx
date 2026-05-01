const DolphinShadow = ({ variant }: { variant: 'one' | 'two' }) => (
  <svg className={`mirror-atmosphere__dolphin mirror-atmosphere__dolphin--${variant}`} viewBox="0 0 120 52" role="img" aria-label="">
    <path
      d="M9 32c18-18 42-25 67-18 12 3 22 10 32 20-16-5-31-5-45 0-17 6-34 6-54-2Z"
      fill="currentColor"
    />
    <path
      d="M43 18c5-11 12-15 22-17-3 9-8 17-17 23Z"
      fill="currentColor"
    />
    <path
      d="M95 29c10-4 17-1 23 6-9 4-17 4-24 0Z"
      fill="currentColor"
    />
    <path
      d="M22 33c-7 2-14 6-20 12 7-1 15-3 22-8Z"
      fill="currentColor"
    />
  </svg>
);

export const MirrorAtmosphere = () => {
  return (
    <div className="mirror-atmosphere" aria-hidden="true">
      <div className="mirror-atmosphere__glow mirror-atmosphere__glow--left" />
      <div className="mirror-atmosphere__glow mirror-atmosphere__glow--right" />
      <div className="mirror-atmosphere__sheen mirror-atmosphere__sheen--one" />
      <div className="mirror-atmosphere__sheen mirror-atmosphere__sheen--two" />
      <div className="mirror-atmosphere__waterline" />
      <div className="mirror-atmosphere__ripple mirror-atmosphere__ripple--one" />
      <div className="mirror-atmosphere__ripple mirror-atmosphere__ripple--two" />
      <DolphinShadow variant="one" />
      <DolphinShadow variant="two" />
      <div className="mirror-atmosphere__fairy mirror-atmosphere__fairy--one" />
      <div className="mirror-atmosphere__fairy mirror-atmosphere__fairy--two" />
      <div className="mirror-atmosphere__fairy mirror-atmosphere__fairy--three" />
    </div>
  );
};
