import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Illustrated placeholder for a salesperson's photo. Flat-illustration style
 * with soft gradient shading so it reads as a face, not a mascot — chosen
 * deliberately over a flatter "cartoon" look per stakeholder feedback.
 *
 * This is a stand-in: the real plan is to let dealership admins upload an
 * actual photo per salesperson, and fall back to this illustration when none
 * is set yet.
 */
export function SalespersonAvatarFull({ size = 190 }: { size?: number }) {
  const h = size * (220 / 190);
  return (
    <Svg width={size} height={h} viewBox="0 0 200 220">
      <Defs>
        <RadialGradient id="skinGrad" cx="38%" cy="30%" r="75%">
          <Stop offset="0%" stopColor="#F2CBA0" />
          <Stop offset="65%" stopColor="#E7B78A" />
          <Stop offset="100%" stopColor="#C99567" />
        </RadialGradient>
        <LinearGradient id="hairGrad" x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0%" stopColor="#5A4433" />
          <Stop offset="100%" stopColor="#2C1F17" />
        </LinearGradient>
        <LinearGradient id="shirtGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#38468C" />
          <Stop offset="100%" stopColor="#1B2450" />
        </LinearGradient>
      </Defs>

      <Path d="M28 220 Q100 158 172 220 L172 226 L28 226 Z" fill="url(#shirtGrad)" />
      <Path d="M88 168 L100 190 L112 168 L100 158 Z" fill="#C33531" />
      <Path d="M88 168 L100 158 L78 152 Z" fill="url(#shirtGrad)" />
      <Path d="M112 168 L100 158 L122 152 Z" fill="url(#shirtGrad)" />

      <Rect x={84} y={132} width={32} height={38} rx={12} fill="url(#skinGrad)" />
      <Ellipse cx={100} cy={160} rx={15} ry={6} fill="#C99567" opacity={0.35} />

      <Ellipse cx={50} cy={98} rx={8} ry={11} fill="url(#skinGrad)" />
      <Ellipse cx={150} cy={98} rx={8} ry={11} fill="url(#skinGrad)" />

      <Ellipse cx={100} cy={92} rx={47} ry={52} fill="url(#skinGrad)" />

      <Path d="M70 78 Q80 71 92 76" stroke="#3A2A1E" strokeWidth={4.5} fill="none" strokeLinecap="round" />
      <Path d="M108 76 Q120 71 130 78" stroke="#3A2A1E" strokeWidth={4.5} fill="none" strokeLinecap="round" />

      <Path d="M74 92 Q82 86 90 92 Q82 98 74 92 Z" fill="#fff" />
      <Circle cx={83} cy={92} r={4.2} fill="#2A2016" />
      <Circle cx={84.5} cy={90.3} r={1.3} fill="#fff" />
      <Path d="M110 92 Q118 86 126 92 Q118 98 110 92 Z" fill="#fff" />
      <Circle cx={119} cy={92} r={4.2} fill="#2A2016" />
      <Circle cx={120.5} cy={90.3} r={1.3} fill="#fff" />

      <Path d="M99 96 Q96 106 100 110 Q103 111 105 109" stroke="#C99567" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.75} />

      <Ellipse cx={72} cy={106} rx={9} ry={5.5} fill="#E8898A" opacity={0.28} />
      <Ellipse cx={128} cy={106} rx={9} ry={5.5} fill="#E8898A" opacity={0.28} />

      <Path d="M82 118 Q100 130 118 118 Q100 126 82 118 Z" fill="#B8654F" />

      <Path
        d="M50 96 Q42 34 100 30 Q158 34 150 96 Q152 66 130 54 Q140 70 128 66 Q118 48 100 46 Q82 48 72 66 Q60 70 70 54 Q48 66 50 96 Z"
        fill="url(#hairGrad)"
      />
      <Path d="M78 46 Q100 38 122 46 Q112 42 100 42 Q88 42 78 46 Z" fill="#6B5240" opacity={0.6} />
    </Svg>
  );
}

/** Small, simplified crop for badges/pinned bars where detail won't read anyway. */
export function SalespersonAvatarMini({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="skinGradMini" cx="38%" cy="30%" r="75%">
          <Stop offset="0%" stopColor="#F2CBA0" />
          <Stop offset="65%" stopColor="#E7B78A" />
          <Stop offset="100%" stopColor="#C99567" />
        </RadialGradient>
        <LinearGradient id="hairGradMini" x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0%" stopColor="#5A4433" />
          <Stop offset="100%" stopColor="#2C1F17" />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={47} r={24} fill="url(#skinGradMini)" />
      <Path d="M26 45 Q24 18 50 17 Q76 18 74 45 Q75 28 50 27 Q25 28 26 45 Z" fill="url(#hairGradMini)" />
      <Path d="M39 46 Q44 42 49 46 Q44 49 39 46 Z" fill="#fff" />
      <Circle cx={44} cy={46} r={2.1} fill="#2A2016" />
      <Path d="M51 46 Q56 42 61 46 Q56 49 51 46 Z" fill="#fff" />
      <Circle cx={56} cy={46} r={2.1} fill="#2A2016" />
      <Path d="M38 58 Q50 67 62 58" stroke="#B8654F" strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
