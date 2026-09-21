import Svg, { type SvgProps, Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const strokeProps = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
});

function base(size: number): SvgProps {
  return { width: size, height: size, viewBox: '0 0 24 24' };
}

export function ArrowLeftIcon({ size = 20, color = '#273368', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M19 12H5M12 19l-7-7 7-7" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function SendIcon({ size = 20, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 18, color = '#9AA0B4', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="6 9 12 15 18 9" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color = '#9AA0B4', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={11} cy={11} r={7} {...strokeProps(color, strokeWidth)} />
      <Line x1={21} y1={21} x2={16.6} y2={16.6} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function HeartIcon({ size = 18, color = '#C33531', strokeWidth = 2.2, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 9.5 7C19 16.65 12 21 12 21z"
        {...strokeProps(color, strokeWidth)}
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function FilterIcon({ size = 18, color = '#273368', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={14} cy={7} r={2.4} fill={color} />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={9} cy={17} r={2.4} fill={color} />
    </Svg>
  );
}

export function GridIcon({ size = 18, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={3} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
      <Rect x={13} y={3} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
      <Rect x={3} y={13} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
      <Rect x={13} y={13} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function MessageIcon({ size = 18, color = '#C33531', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function UserIcon({ size = 18, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={8} r={4} {...strokeProps(color, strokeWidth)} />
      <Path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function PhoneIcon({ size = 20, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
        {...strokeProps(color, strokeWidth)}
      />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = '#fff', strokeWidth = 3 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="20 6 9 17 4 12" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function UploadIcon({ size = 16, color = '#fff', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 16V5" {...strokeProps(color, strokeWidth)} />
      <Path d="M8 9l4-4 4 4" {...strokeProps(color, strokeWidth)} />
      <Path d="M4 19h16" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function DownloadIcon({ size = 16, color = '#273368', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 4v11" {...strokeProps(color, strokeWidth)} />
      <Path d="M8 12l4 4 4-4" {...strokeProps(color, strokeWidth)} />
      <Path d="M4 19h16" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function StarIcon({ size = 14, color = '#C33531' }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M12 2l2.5 5.6L21 8.3l-4.6 4.2L17.6 19 12 15.9 6.4 19l1.2-6.5L3 8.3l6.5-.7L12 2z"
        fill={color}
      />
    </Svg>
  );
}

export function ShieldIcon({ size = 20, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} {...strokeProps(color, strokeWidth)} />
      <Path d="M12 7v5l3 2" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function WrenchIcon({ size = 20, color = '#273368', strokeWidth = 2 }: IconProps) {
  // The previous path (a single diagonal sliver) read as a stray pen
  // stroke at the small sizes this actually renders at (Terry: "the
  // service icon needs something different, it doesn't look right"). This
  // is the standard wrench glyph — recognizable at 16-20px.
  return (
    <Svg {...base(size)}>
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.41l1.59 1.59a1 1 0 0 0 1.41 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        {...strokeProps(color, strokeWidth)}
      />
    </Svg>
  );
}

export function MapPinIcon({ size = 20, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" {...strokeProps(color, strokeWidth)} />
      <Circle cx={12} cy={9} r={2.5} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color = '#fff', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Line x1={12} y1={5} x2={12} y2={19} {...strokeProps(color, strokeWidth)} />
      <Line x1={5} y1={12} x2={19} y2={12} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color = '#C9CDD9', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={7} width={18} height={13} rx={2} {...strokeProps(color, strokeWidth)} />
      <Circle cx={12} cy={13.5} r={3.5} {...strokeProps(color, strokeWidth)} />
      <Path d="M8 7l1.5-3h5L16 7" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function IdCardIcon({ size = 21, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={5} width={18} height={14} rx={2} {...strokeProps(color, strokeWidth)} />
      <Circle cx={8.5} cy={11} r={2} {...strokeProps(color, strokeWidth)} />
      <Path d="M5 17c.5-2 2-3 3.5-3s3 1 3.5 3" {...strokeProps(color, strokeWidth)} />
      <Line x1={14} y1={9} x2={18} y2={9} {...strokeProps(color, strokeWidth)} />
      <Line x1={14} y1={13} x2={18} y2={13} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function DocumentIcon({ size = 21, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={4} y={3} width={16} height={18} rx={2} {...strokeProps(color, strokeWidth)} />
      <Line x1={8} y1={8} x2={16} y2={8} {...strokeProps(color, strokeWidth)} />
      <Line x1={8} y1={12} x2={16} y2={12} {...strokeProps(color, strokeWidth)} />
      <Line x1={8} y1={16} x2={12} y2={16} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function GaugeIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} {...strokeProps(color, strokeWidth)} />
      <Path d="M12 7v5l3 2" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function TransmissionIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={8} cy={17} r={3} {...strokeProps(color, strokeWidth)} />
      <Circle cx={17} cy={17} r={3} {...strokeProps(color, strokeWidth)} />
      <Path d="M8 17h6l3-9h-3" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function DrivetrainIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 14l2-6h12l2 6M4 14v4h2v-2h12v2h2v-4M4 14h16" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function FuelIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 3h9l3 6v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3z" {...strokeProps(color, strokeWidth)} />
      <Line x1={6} y1={12} x2={18} y2={12} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function CarFrontIllustration({
  size = 220,
  bodyColor = '#273368',
}: {
  size?: number;
  bodyColor?: string;
}) {
  const h = size * (100 / 220);
  return (
    <Svg width={size} height={h} viewBox="0 0 220 100">
      <Path d="M14 76 L26 44 Q34 30 54 30 L150 30 Q170 30 178 44 L190 76 Z" fill={bodyColor} />
      <Rect x={16} y={70} width={188} height={18} rx={9} fill="#20263F" />
      <Circle cx={62} cy={88} r={14} fill="#141A47" />
      <Circle cx={62} cy={88} r={5.5} fill="#AEB6CE" />
      <Circle cx={158} cy={88} r={14} fill="#141A47" />
      <Circle cx={158} cy={88} r={5.5} fill="#AEB6CE" />
      <Rect x={42} y={38} width={24} height={14} rx={2} fill="#B9C6E8" />
      <Rect x={146} y={38} width={24} height={14} rx={2} fill="#B9C6E8" />
    </Svg>
  );
}

/** Side-profile car for the timeline road — a small character that "drives"
 * along the path, distinct from CarFrontIllustration's front-on card hero. */
export function CarSideIcon({ size = 56, bodyColor = '#C33531' }: { size?: number; bodyColor?: string }) {
  const h = size * (50 / 100);
  return (
    <Svg width={size} height={h} viewBox="0 0 100 50">
      <Path
        d="M6 38 L6 30 Q6 26 10 24 L22 24 Q28 13 43 13 L63 13 Q75 13 80 24 L90 24 Q94 26 94 30 L94 38 Z"
        fill={bodyColor}
      />
      <Rect x={3} y={33} width={94} height={9} rx={4.5} fill="#20263F" />
      <Path d="M27 22 L34 15 L58 15 L65 22 Z" fill="#B9C6E8" />
      <Line x1={45.5} y1={15} x2={45.5} y2={22} stroke="#8FA3D6" strokeWidth={1.5} />
      <Circle cx={24} cy={40} r={8} fill="#141A47" />
      <Circle cx={24} cy={40} r={3.2} fill="#AEB6CE" />
      <Circle cx={74} cy={40} r={8} fill="#141A47" />
      <Circle cx={74} cy={40} r={3.2} fill="#AEB6CE" />
    </Svg>
  );
}

export function AvatarPersonIcon({ size = 24, color = '#3B2A20', skinColor = '#E8B98A' }: IconProps & { skinColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={47} r={24} fill={skinColor} />
      <Path d="M26 45 Q24 18 50 17 Q76 18 74 45 Q75 28 50 27 Q25 28 26 45 Z" fill={color} />
    </Svg>
  );
}

export function CheckCircleIcon({ size = 16, color = '#2F9E60', strokeWidth = 3.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="20 6 9 17 4 12" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function PackageIcon({ size = 15, color = '#B7BBCB', strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 22V4a1 1 0 0 1 1-1h10l5 5v14" {...strokeProps(color, strokeWidth)} />
      <Path d="M5 3v6h9" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

/** The real WhatsApp glyph (filled, not stroked — this is a solid brand
 * mark, unlike every line icon above it). Used on the salesperson screen
 * now that "Message a UCG Specialist" routes to WhatsApp instead of an AI
 * call (Terry, Sept: the AI chat costs too much to run; replace it with a
 * real WhatsApp hand-off). Path is the standard Simple Icons "WhatsApp"
 * mark (24x24, CC0) — recognizable rather than a generic chat bubble. */
export function WhatsAppIcon({ size = 20, color = '#fff' }: Pick<IconProps, 'size' | 'color'>) {
  return (
    <Svg {...base(size)}>
      <Path
        fill={color}
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"
      />
    </Svg>
  );
}
