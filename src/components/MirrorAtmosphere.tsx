export const MirrorAtmosphere = () => {
  return (
    <div className="mirror-atmosphere" aria-hidden="true">
      <div className="mirror-atmosphere__glow mirror-atmosphere__glow--left" />
      <div className="mirror-atmosphere__glow mirror-atmosphere__glow--right" />
      <div className="mirror-atmosphere__sheen mirror-atmosphere__sheen--one" />
      <div className="mirror-atmosphere__sheen mirror-atmosphere__sheen--two" />
      <div className="mirror-atmosphere__waterline" />
    </div>
  );
};
