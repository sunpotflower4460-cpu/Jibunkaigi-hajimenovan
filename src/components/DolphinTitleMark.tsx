export const DolphinTitleMark = ({ compact = false }: { compact?: boolean }) => {
  return (
    <span className={`dolphin-title-mark ${compact ? 'dolphin-title-mark--compact' : ''}`} aria-hidden="true">
      <span className="dolphin-title-mark__water" />
      <span className="dolphin-title-mark__shadow dolphin-title-mark__shadow--one" />
      <span className="dolphin-title-mark__shadow dolphin-title-mark__shadow--two" />
    </span>
  );
};
